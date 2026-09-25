export const mealPeriods=['아침','점심','저녁','밤'] as const;
export function recordMealPeriod(createdAt?:string){
 if(!createdAt)return null;
 const timestamp=Date.parse(createdAt);if(!Number.isFinite(timestamp))return null;
 const hour=new Date(timestamp+9*3600000).getUTCHours();
 return hour>=4&&hour<11?'아침':hour>=11&&hour<17?'점심':hour>=17&&hour<23?'저녁':'밤';
}
export function calendarCalories(logs:{date:string;calories:number|null;createdAt?:string}[]){
 const days:Record<string,{count:number;kcal:number;missing:number;periods:string[]}>={};
 for(const log of logs){const day=days[log.date]??={count:0,kcal:0,missing:0,periods:[]};day.count++;if(log.calories===null||!Number.isFinite(log.calories))day.missing++;else day.kcal+=log.calories;const period=recordMealPeriod(log.createdAt);if(period&&!day.periods.includes(period))day.periods.push(period);}
 for(const day of Object.values(days))day.periods.sort((a,b)=>mealPeriods.indexOf(a as typeof mealPeriods[number])-mealPeriods.indexOf(b as typeof mealPeriods[number]));
 return days;
}
