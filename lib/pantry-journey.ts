export type PantryMeal={id:string;recipeId:string;name:string;eatenAt:string;status:'pending'|'saved'};
export type PantryJourney={meals:PantryMeal[];favorites:string[]};
export const journeyKey=(userId?:string)=>`kkiniplan-pantry-journey-v1-${userId??'guest'}`;
export const mealDate=(date:string)=>new Date(date).toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});
export function parseJourney(raw:string|null):PantryJourney{
 try{
  const data=JSON.parse(raw??'{}');
  return {meals:Array.isArray(data.meals)?data.meals.filter((m:PantryMeal)=>m&&typeof m.id==='string'&&/^[0-9a-f-]{36}$/i.test(m.id)&&typeof m.recipeId==='string'&&m.recipeId.startsWith('source-')&&typeof m.name==='string'&&m.name.length<=100&&Number.isFinite(Date.parse(m.eatenAt))&&['pending','saved'].includes(m.status)).slice(-365):[],favorites:Array.isArray(data.favorites)?[...new Set<string>(data.favorites.filter((s:unknown)=>typeof s==='string'&&s.startsWith('source-')))].slice(0,100):[]};
 }catch{return {meals:[],favorites:[]};}
}
export function recentRecipeIds(meals:PantryMeal[],now=Date.now()){
 return [...new Set(meals.filter(m=>m.status==='saved'&&now-Date.parse(m.eatenAt)>=0&&now-Date.parse(m.eatenAt)<3*86400000).map(m=>m.recipeId))];
}
export function todayMeal(meals:PantryMeal[],recipeId:string,date:string){return meals.find(m=>m.recipeId===recipeId&&mealDate(m.eatenAt)===date);}
