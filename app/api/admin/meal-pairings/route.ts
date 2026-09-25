import {NextRequest} from 'next/server';
import {adminUser} from '../../../../lib/admin';
import {sameOrigin} from '../../../../lib/auth';
import {getPool} from '../../../../lib/db';
import {governmentOptimizedRecipeProducts} from '../../../../lib/recipe-optimizer-plan';
import {composePairing,proposePairings,templates} from '../../../../lib/meal-pairings';
import {listPairings,savePairingProposals} from '../../../../lib/meal-pairing-store';
import {clearPlanCatalog} from '../../../../lib/shopping-plan-catalog';
import {servingNutrients} from '../../../../lib/serving-nutrients';
import roles from '../../../../data/dish-roles.json';
export const maxDuration=60;
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:NextRequest){
 if(!await adminUser(request))return json({error:'관리자 권한이 필요해요.'},403);
 try{
  if(request.nextUrl.searchParams.get('snapshots')==='1'){
   const {rows}=await getPool().query('SELECT id,created_at,composition_snapshot FROM shopping_plans WHERE composition_snapshot IS NOT NULL ORDER BY id DESC LIMIT 20');
   return json({snapshots:rows.map(row=>({id:row.id,createdAt:row.created_at,version:row.composition_snapshot.version,meals:row.composition_snapshot.products.map((p:import('../../../../lib/shopping-plan').PlanProduct)=>({name:p.name,price:p.price,composition:p.recipe?.composition??null}))}))});
  }
  const history=request.nextUrl.searchParams.get('history');
  if(history){if(!/^\d+$/.test(history))return json({error:'관계를 확인해 주세요.'},400);return json({history:(await getPool().query('SELECT created_at,before_data,after_data FROM meal_pairing_audit WHERE relation_id=$1 ORDER BY id DESC LIMIT 20',[history])).rows});}
  const [relations,mains,sides]=await Promise.all([listPairings(),governmentOptimizedRecipeProducts(),governmentOptimizedRecipeProducts('side')]);
  const byId=new Map([...mains,...sides].map(p=>[p.id,p]));
  const rows=relations.map(r=>{
   const main=byId.get(r.anchor_id),side=byId.get(r.companion_id);
   const combined=main&&side?composePairing(main,[side],[r]):null;
   return {...r,mainRole:(roles as Record<string,string>)[r.anchor_id.replace(/^recipe-opt-/,'')]??'unclassified',mainName:main?.name??r.anchor_id,companionName:side?.name??r.companion_id,available:!!combined,
    preview:combined?{name:combined.name,price:combined.price,nutrition:servingNutrients(combined),minutes:combined.recipe!.minutes,hasRice:main!.recipe!.ingredients.some(i=>i.label.startsWith('함께 먹는 밥')),ingredients:combined.recipe!.ingredients.map(i=>i.label)}:null};
  });
  return json({relations:rows,templates});
 }catch{return json({error:'조합을 불러오지 못했어요.'},503);}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return json({error:'요청을 확인해 주세요.'},403);
 const user=await adminUser(request);if(!user)return json({error:'관리자 권한이 필요해요.'},403);
 try{
  const [mains,sides]=await Promise.all([governmentOptimizedRecipeProducts(),governmentOptimizedRecipeProducts('side')]);
  const inserted=await savePairingProposals(proposePairings(mains,sides),Object.entries(roles).map(([id,role])=>({menu_id:`recipe-opt-${id}`,role})),user.id);
  return json({inserted});
 }catch{return json({error:'조합 후보를 저장하지 못했어요.'},503);}
}
export async function PATCH(request:NextRequest){
 if(!sameOrigin(request))return json({error:'요청을 확인해 주세요.'},403);
 const user=await adminUser(request);if(!user)return json({error:'관리자 권한이 필요해요.'},403);
 const raw=await request.text();if(raw.length>5000)return json({error:'입력이 너무 길어요.'},400);
 let input;try{input=JSON.parse(raw);}catch{return json({error:'입력을 확인해 주세요.'},400);}
 if(!/^\d+$/.test(String(input?.id))||!['suggested','approved','excluded'].includes(input?.status)||!Number.isInteger(input?.score)||input.score<0||input.score>100||typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>1000)return json({error:'점수(0~100)와 이유를 확인해 주세요.'},400);
 const available=input.status==='approved'?await Promise.all([governmentOptimizedRecipeProducts(),governmentOptimizedRecipeProducts('side')]):null;
 const client=await getPool().connect();
 try{
  await client.query('BEGIN');
  const old=(await client.query('SELECT * FROM meal_pairing_relations WHERE id=$1 FOR UPDATE',[input.id])).rows[0];
  if(!old){await client.query('ROLLBACK');return json({error:'조합이 없어요.'},404);}
  if(available&&old.relation_type==='pairing'&&(!available[0].some(p=>p.id===old.anchor_id&&p.recipe?.ingredients.some(i=>i.label.startsWith('함께 먹는 밥')))||!available[1].some(p=>p.id===old.companion_id))){await client.query('ROLLBACK');return json({error:'현재 사용할 수 없는 메뉴예요. 분류와 재료를 확인해 주세요.'},422);}
  const updated=(await client.query('UPDATE meal_pairing_relations SET status=$2,score=$3,reason=$4,reviewed_by=$5,updated_at=now() WHERE id=$1 RETURNING *',[input.id,input.status,input.score,input.reason.trim(),user.id])).rows[0];
  await client.query('INSERT INTO meal_pairing_audit(relation_id,actor,before_data,after_data) VALUES($1,$2,$3,$4)',[input.id,user.id,JSON.stringify(old),JSON.stringify(updated)]);
  await client.query('COMMIT');clearPlanCatalog();return json({saved:true});
 }catch{await client.query('ROLLBACK');return json({error:'저장하지 못했어요.'},503);}finally{client.release();}
}
