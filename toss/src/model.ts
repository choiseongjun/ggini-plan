import {initialHomeConditions,parseConditions,validMealIds,purchaseBasket,MAX_PLAN_DAYS,type PlanProduct,type PlanConditions,type MealSlot} from '../../lib/shopping-plan';
export type Saved={conditions:PlanConditions;ids:string[];have:Record<string,number>};
export const initialTossConditions:PlanConditions={...initialHomeConditions,mealMode:'cook',budget:1000000,goal:'maintain',budgetMode:'balanced',mealKinds:[]};
export function configurePlan(form:PlanConditions,mealCap:number|null):PlanConditions|null{
 if(mealCap!==null&&(!Number.isInteger(mealCap)||mealCap<500||mealCap>50000))return null;
 return parseConditions({...form,mealMode:'cook',cooking:'all',mealKinds:[],budgetMode:'balanced',budget:mealCap===null?1000000:Math.min(1000000,Math.max(1000,mealCap*form.meals*(form.people??1)))});
}
export function changeSlots(form:PlanConditions,slots:MealSlot[]):PlanConditions{
 if(!slots.length)return form;
 const meals=form.mealCountMode?Math.min(form.meals,MAX_PLAN_DAYS*slots.length):(form.days??7)*slots.length;
 return {...form,slots,meals,days:Math.ceil(meals/slots.length)};
}
export function storedStock(raw:string|null):Record<string,number>{
 try{const have=JSON.parse(raw??'null')?.have;if(!have||typeof have!=='object'||Array.isArray(have))return {};
  return Object.fromEntries(Object.entries(have).filter(([id,n])=>id!=='__proto__'&&id!=='constructor'&&id!=='prototype'&&typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=10000)) as Record<string,number>;
 }catch{return {};}
}
export function shoppingRows(saved:Saved,products:PlanProduct[]){
 return purchaseBasket(saved.ids,products,[],saved.have,undefined,saved.conditions.people??1);
}
export function ingredientAmount(product:PlanProduct,packs:number){
 const amount=Math.round(packs*product.quantity*10)/10;
 return `${amount.toLocaleString('ko-KR')}${product.unit}`;
}
export function parseSaved(raw:string|null,products:PlanProduct[]):Saved|null{
 try{const v=JSON.parse(raw??'null'),conditions=parseConditions(v?.conditions);if(!conditions||!Array.isArray(v.ids)||!validMealIds(v.ids,products,conditions)||!v.have||typeof v.have!=='object'||Array.isArray(v.have)||Object.values(v.have).some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>10000))return null;return {conditions,ids:v.ids,have:v.have};}catch{return null;}
}
