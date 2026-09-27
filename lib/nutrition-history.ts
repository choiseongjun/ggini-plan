export const historyNutrients=[['calories','칼로리','kcal'],['carbs','탄수화물','g'],['protein','단백질','g'],['fat','지방','g'],['sugar','당류','g'],['sodium','나트륨','mg']] as const;
export type NutritionHistoryLog={date:string}&Partial<Record<typeof historyNutrients[number][0],number|null>>;
export function nutritionHistoryTotals(logs:NutritionHistoryLog[]){
 return historyNutrients.map(([key,label,unit])=>{
  const known=logs.filter(log=>typeof log[key]==='number'&&Number.isFinite(log[key]));
  const days=new Set(known.map(log=>log.date)).size;
  const sum=known.reduce((n,log)=>n+log[key]!,0);
  return {key,label,unit,total:known.length?Math.round(sum*10)/10:null,average:days?Math.round(sum/days*10)/10:null,days,missing:logs.length-known.length};
 });
}
