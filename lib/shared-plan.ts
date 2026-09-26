import {createHash,randomUUID} from 'node:crypto';
import {basket,purchaseBasket,mealSchedule,parseConditions,type PlanProduct,type MealSlot,type MealSideCounts} from './shopping-plan';
import {servingNutrition} from './food-intake';
import {getPool} from './db';

export type SharedPlan={people?:number;sideCount?:number;mealSideCounts?:MealSideCounts;days:number;slots:MealSlot[];meals:{productId:string;day:number;slot:MealSlot}[];products:{id:string;name:string;image:string|null;url:string|null;price:number;servings:number;calories:number|null;protein:number|null;packs:number}[];purchases?:{id:string;name:string;price:number;packs:number}[];total:number};
export function sharedPlanSnapshot(raw:unknown,mealIds:unknown,products:PlanProduct[]):SharedPlan|null{
 const c=parseConditions(raw);
 if(!c||!Array.isArray(mealIds)||mealIds.length!==c.meals||mealIds.some(id=>typeof id!=='string'||!products.some(p=>p.id===id)))return null;
 const schedule=mealSchedule(c),rows=basket(mealIds,products,[],{},c.people);
 // Explicit allowlist: no owner, preferences, inventory, budget or intake records.
 return {people:c.people??1,sideCount:c.sideCount??0,...(c.mealSideCounts?{mealSideCounts:c.mealSideCounts}:{}),days:Math.max(...schedule.map(s=>s.day)),slots:[...new Set(schedule.map(s=>s.slot))],
  meals:mealIds.map((productId,i)=>({productId,...schedule[i]})),
  products:rows.map(({product:p,packs})=>({id:p.id,name:p.name,image:p.productImageUrl,url:p.productUrl,price:p.price,servings:p.servings,...servingNutrition(p),packs})),
  purchases:purchaseBasket(mealIds,products,[],{},undefined,c.people).map(r=>({id:r.product.id,name:r.product.name,price:r.product.price,packs:r.packs})),
  total:rows.reduce((sum,r)=>sum+r.cost,0)};
}
export const validShareId=(id:unknown):id is string=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
// Shared by /api/shared-plans and /api/community so both dedupe against the same fingerprint.
export async function createSharedPlan(userId:string,raw:unknown,mealIds:unknown,products:PlanProduct[]):Promise<{id:string,snapshot:SharedPlan}|null>{
 const snapshot=sharedPlanSnapshot(raw,mealIds,products);
 if(!snapshot)return null;
 const encoded=JSON.stringify(snapshot),fingerprint=createHash('sha256').update(encoded).digest('hex');
 const result=await getPool().query('INSERT INTO shared_shopping_plans(id,user_id,fingerprint,snapshot) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,fingerprint) DO UPDATE SET fingerprint=EXCLUDED.fingerprint RETURNING id',[randomUUID(),userId,fingerprint,encoded]);
 return {id:result.rows[0].id,snapshot};
}
