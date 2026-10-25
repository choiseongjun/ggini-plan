import {nutritionScale, type DetailedNutritionData, type NutritionAmount} from './detailed-nutrition';

export type OfficialMealPart = {role: 'main'|'rice'|'side'; name: string; code: string; amount: NutritionAmount | null; reference: DetailedNutritionData | null};
export type OfficialMealNutrition = {parts: OfficialMealPart[]};
export type MealNutrient = {key:string; name:string; unit:string; group:string; value:number|null; known:number; total:number};
const nutrientCache=new WeakMap<OfficialMealNutrition,MealNutrient[]>();

// A missing component is never zero. Different units/chemical equivalents remain separate.
export function officialMealNutrients(meal:OfficialMealNutrition):MealNutrient[]{
 const cached=nutrientCache.get(meal);if(cached)return cached;
 const rows=new Map<string,MealNutrient>();
 for(const part of meal.parts){
  const factor=part.reference?nutritionScale(part.reference.basis,part.amount):null;
  for(const n of part.reference?.nutrients??[]){
   const key=`${n.name}|${n.unit.replace('µ','μ')}`;
   const row=rows.get(key)??{key,name:n.name,unit:n.unit,group:n.group,value:null,known:0,total:meal.parts.length};
   if(factor!==null&&n.value!==null){row.value=(row.value??0)+n.value*factor;row.known++;}
   rows.set(key,row);
  }
 }
 const result=[...rows.values()];nutrientCache.set(meal,result);return result;
}

export function officialMealMacros(meal:OfficialMealNutrition){
 const rows=officialMealNutrients(meal);
 const value=(name:string,unit:string)=>{const n=rows.find(n=>n.name===name&&n.unit===unit);return n&&n.known===n.total?n.value:null;};
 return {calories:value('에너지','kcal'),protein:value('단백질','g'),carbs:value('탄수화물','g'),fat:value('지방','g'),sodium:value('나트륨','mg'),sugar:value('당류','g')};
}

export function officialMealComplete(meal:OfficialMealNutrition){
 const n=officialMealMacros(meal);
 return meal.parts.length>0&&n.calories!==null&&n.protein!==null;
}
