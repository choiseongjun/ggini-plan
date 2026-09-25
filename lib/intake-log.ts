import {NextResponse} from 'next/server';
import {authFailure} from './auth';
import {getPool} from './db';
import {servingNutrition,validPortions} from './food-intake';
import {EXTRA_PREFIX,intakeExtras,parseIntakeExtras} from './intake-extras';
import {planProducts} from './shopping-plan-catalog';
import {servingNutrients} from './serving-nutrients';
import {REFERENCE_PREFIX,foodReferenceByCode,foodReferencesByCodes} from './food-reference';

const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});

// Records what was actually eaten — the recommended dish at a chosen portion and/or quick "함께 먹은 것"
// extras — without requiring the ingredients to be registered as owned. Rows carry stock_item {kind:'none'}
// so undo knows there is no pantry quantity to restore.
export async function logMeal(userId:string|number,input:{id:string;productId?:unknown;portions?:unknown;extras?:unknown},photos:Buffer[]=[]){
 const extras=parseIntakeExtras(input.extras);
 if(!extras)return authFailure('함께 먹은 음식과 양을 확인해 주세요.',400);
 const references=await foodReferencesByCodes(extras.flatMap(e=>typeof e==='string'?[]:[e.referenceCode]));
 if(extras.some(e=>typeof e!=='string'&&!references.some(f=>f.code===e.referenceCode)))return authFailure('추가한 음식 정보를 찾지 못했어요. 다시 검색해 주세요.',422);
 const hasMain=input.productId!==undefined&&input.productId!==null;
 if(hasMain&&(typeof input.productId!=='string'||input.productId.length>100||!validPortions(input.portions)))return authFailure('메뉴와 먹은 양을 확인해 주세요.',400);
 if(!hasMain&&!extras.length)return authFailure('기록할 음식을 골라 주세요.',400);
 const main=hasMain?(await planProducts()).find(p=>p.id===input.productId):null;
 if(hasMain&&!main)return authFailure('메뉴 정보를 확인할 수 없어요.',422);
 const portions=hasMain?input.portions as number:1;
 const rows:Entry[]=[];
 if(main){const n=servingNutrition(main),m=servingNutrients(main),x=(v:number|null)=>v===null?null:v*portions;rows.push({id:input.id,productId:main.id,name:main.name,portions,calories:x(n.calories),protein:x(n.protein),cost:main.price/main.servings*portions,carbs:x(m.carbs),sugar:null,sodium:x(m.sodium),fat:x(m.fat)});}
 for(const extra of extras){
  const id=rows.length?crypto.randomUUID():input.id;
  if(typeof extra==='string'){const e=intakeExtras[extra];rows.push({id,productId:`${EXTRA_PREFIX}${extra}`,name:e.label,portions:1,calories:e.calories,protein:e.protein,cost:null,carbs:null,sugar:null,sodium:null,fat:null});}
  else{
   const f=references.find(f=>f.code===extra.referenceCode)!,p=extra.portions,x=(v:number|null)=>v===null?null:Math.round(v*p*10)/10;
   rows.push({id,productId:`${REFERENCE_PREFIX}${f.code}`,name:f.brand?`${f.name} (${f.brand})`:f.name,portions:p,calories:x(f.kcal),protein:x(f.protein),cost:null,carbs:x(f.carbs),sugar:x(f.sugar),sodium:x(f.sodium),fat:x(f.fat)});
  }
 }
 return insertEntries(userId,input.id,rows,photos);
}

type Entry={id:string;productId:string;name:string;portions:number;calories:number|null;protein:number|null;cost:number|null;carbs:number|null;sugar:number|null;sodium:number|null;fat:number|null};

// 간식·디저트·음료·외식: 음식 영양 사전의 1회 제공량 × 먹은 양. 영양은 서버가 사전에서 다시 계산한다(화면 값을 믿지 않는다).
export async function logReference(userId:string|number,input:{id:string;referenceCode?:unknown;portions?:unknown},photos:Buffer[]=[]){
 if(typeof input.referenceCode!=='string'||input.referenceCode.length>60||!validPortions(input.portions))return authFailure('음식과 먹은 양을 확인해 주세요.',400);
 const food=await foodReferenceByCode(input.referenceCode);
 if(!food)return authFailure('음식 정보를 찾지 못했어요.',422);
 const p=input.portions as number,x=(v:number|null)=>v===null?null:Math.round(v*p*10)/10;
 return insertEntries(userId,input.id,[{id:input.id,productId:`${REFERENCE_PREFIX}${food.code}`,name:food.brand?`${food.name} (${food.brand})`:food.name,portions:p,calories:x(food.kcal),protein:x(food.protein),cost:null,carbs:x(food.carbs),sugar:x(food.sugar),sodium:x(food.sodium),fat:x(food.fat)}],photos);
}

async function insertEntries(userId:string|number,requestId:string,rows:Entry[],photos:Buffer[]=[]){
 const client=await getPool().connect();
 try{
  await client.query('BEGIN');
  if((await client.query('SELECT 1 FROM food_intake_logs WHERE user_id=$1 AND id=$2',[userId,requestId])).rows[0]){await client.query('COMMIT');return json({saved:true,replayed:true});}
  for(const r of rows)
   await client.query('INSERT INTO food_intake_logs(user_id,id,product_id,product_name,portions,packs,calories,protein,stock_item,cost,carbs,sugar,sodium,fat) VALUES($1,$2,$3,$4,$5,$5,$6,$7,$8,$9,$10,$11,$12,$13)',[userId,r.id,r.productId,r.name,r.portions,r.calories,r.protein,JSON.stringify({kind:'none'}),r.cost,r.carbs,r.sugar,r.sodium,r.fat]);
  for(const [position,image] of photos.entries())await client.query('INSERT INTO food_intake_photos(user_id,log_id,position,image) VALUES($1,$2,$3,$4)',[userId,requestId,position,image]);
  await client.query('COMMIT');return json({saved:true,count:rows.length,ids:rows.map(r=>r.id),calories:rows.reduce((sum,r)=>sum+(r.calories??0),0)});
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}

// Only server-validated photo estimates reach this function. No price or stock deduction.
export async function logPhotoFood(userId:string|number,id:string,food:import('./meal-photo-ai').PhotoFood,photos:Buffer[]=[]){
 return insertEntries(userId,id,[{id,productId:`photo:${id}`,name:`${food.name} (사진 추정)`,portions:1,calories:food.calories,protein:food.protein,carbs:food.carbs,fat:food.fat,sugar:null,sodium:null,cost:null}],photos);
}
