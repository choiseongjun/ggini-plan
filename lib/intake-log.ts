import {NextResponse} from 'next/server';
import {authFailure} from './auth';
import {getPool} from './db';
import {servingNutrition,validPortions} from './food-intake';
import {EXTRA_PREFIX,intakeExtras,isIntakeExtra} from './intake-extras';
import {planProducts} from './shopping-plan-catalog';

const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});

// Records what was actually eaten — the recommended dish at a chosen portion and/or quick "함께 먹은 것"
// extras — without requiring the ingredients to be registered as owned. Rows carry stock_item {kind:'none'}
// so undo knows there is no pantry quantity to restore.
export async function logMeal(userId:string|number,input:{id:string;productId?:unknown;portions?:unknown;extras?:unknown}){
 const extras=Array.isArray(input.extras)?input.extras:[];
 if(extras.length>10||!extras.every(isIntakeExtra)||new Set(extras).size!==extras.length)return authFailure('함께 먹은 것을 확인해 주세요.',400);
 const hasMain=input.productId!==undefined&&input.productId!==null;
 if(hasMain&&(typeof input.productId!=='string'||input.productId.length>100||!validPortions(input.portions)))return authFailure('메뉴와 먹은 양을 확인해 주세요.',400);
 if(!hasMain&&!extras.length)return authFailure('기록할 음식을 골라 주세요.',400);
 const main=hasMain?(await planProducts()).find(p=>p.id===input.productId):null;
 if(hasMain&&!main)return authFailure('메뉴 정보를 확인할 수 없어요.',422);
 const portions=hasMain?input.portions as number:1;
 const rows:[string,string,string,number,number|null,number|null,number|null][]=[];
 if(main){const n=servingNutrition(main);rows.push([input.id,main.id,main.name,portions,n.calories===null?null:n.calories*portions,n.protein===null?null:n.protein*portions,main.price/main.servings*portions]);}
 for(const key of extras){const e=intakeExtras[key];rows.push([rows.length?crypto.randomUUID():input.id,`${EXTRA_PREFIX}${key}`,e.label,1,e.calories,e.protein,null]);}
 const client=await getPool().connect();
 try{
  await client.query('BEGIN');
  if((await client.query('SELECT 1 FROM food_intake_logs WHERE user_id=$1 AND id=$2',[userId,input.id])).rows[0]){await client.query('COMMIT');return json({saved:true,replayed:true});}
  for(const [id,productId,name,amount,calories,protein,cost] of rows)
   await client.query('INSERT INTO food_intake_logs(user_id,id,product_id,product_name,portions,packs,calories,protein,stock_item,cost) VALUES($1,$2,$3,$4,$5,$5,$6,$7,$8,$9)',[userId,id,productId,name,amount,calories,protein,JSON.stringify({kind:'none'}),cost]);
  await client.query('COMMIT');return json({saved:true,count:rows.length,ids:rows.map(r=>r[0]),calories:rows.reduce((sum,r)=>sum+(r[4]??0),0)});
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
