export const historyNutrients=[['calories','칼로리','kcal'],['carbs','탄수화물','g'],['protein','단백질','g'],['fat','지방','g'],['sugar','당류','g'],['sodium','나트륨','mg']] as const;
export type NutritionHistoryLog={date:string}&Partial<Record<typeof historyNutrients[number][0],number|null>>;
export function nutritionHistoryTotals(logs:NutritionHistoryLog[]){
 return historyNutrients.map(([key,label,unit])=>{
  const known=logs.filter(log=>typeof log[key]==='number'&&Number.isFinite(log[key]));
  // An unknown item makes that day's total incomplete. Keep its known subtotal,
  // but exclude the whole day from averages instead of treating it as zero.
  const completeDates=[...new Set(known.map(log=>log.date))].filter(date=>logs.filter(log=>log.date===date).every(log=>typeof log[key]==='number'&&Number.isFinite(log[key])));
  const days=completeDates.length;
  const averageSum=known.filter(log=>completeDates.includes(log.date)).reduce((n,log)=>n+log[key]!,0);
  const sum=known.reduce((n,log)=>n+log[key]!,0);
  return {key,label,unit,total:known.length?Math.round(sum*10)/10:null,average:days?Math.round(averageSum/days*10)/10:null,days,missing:logs.length-known.length};
 });
}
