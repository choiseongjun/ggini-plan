import {basket,purchaseBasket,mealSchedule,parseConditions,type PlanProduct,type MealSlot} from './shopping-plan';
import {servingNutrition} from './food-intake';

export type SharedPlan={days:number;slots:MealSlot[];meals:{productId:string;day:number;slot:MealSlot}[];products:{id:string;name:string;image:string|null;url:string|null;price:number;servings:number;calories:number|null;protein:number|null;packs:number}[];purchases?:{id:string;name:string;price:number;packs:number}[];total:number};
export function sharedPlanSnapshot(raw:unknown,mealIds:unknown,products:PlanProduct[]):SharedPlan|null{
 const c=parseConditions(raw);
 if(!c||!Array.isArray(mealIds)||mealIds.length!==c.meals||mealIds.some(id=>typeof id!=='string'||!products.some(p=>p.id===id)))return null;
 const schedule=mealSchedule(c),rows=basket(mealIds,products,[]);
 // Explicit allowlist: no owner, preferences, inventory, budget or intake records.
 return {days:Math.max(...schedule.map(s=>s.day)),slots:[...new Set(schedule.map(s=>s.slot))],
  meals:mealIds.map((productId,i)=>({productId,...schedule[i]})),
  products:rows.map(({product:p,packs})=>({id:p.id,name:p.name,image:p.productImageUrl,url:p.productUrl,price:p.price,servings:p.servings,...servingNutrition(p),packs})),
  purchases:purchaseBasket(mealIds,products,[]).map(r=>({id:r.product.id,name:r.product.name,price:r.product.price,packs:r.packs})),
  total:rows.reduce((sum,r)=>sum+r.cost,0)};
}
export const validShareId=(id:unknown):id is string=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
