// UI times are explicitly Korea time, independent of the device's timezone.
export function mealTimeLocal(value:Date|string=new Date()){
 const time=new Date(value).getTime();
 return Number.isFinite(time)?new Date(time+9*3600000).toISOString().slice(0,16):'';
}
export function mealTimeISO(local:string){
 if(!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))return null;
 const time=new Date(`${local}:00+09:00`);
 return Number.isFinite(time.getTime())&&mealTimeLocal(time)===local?time.toISOString():null;
}
export function validEatenAt(value:unknown,now=Date.now()):value is string{
 if(typeof value!=='string'||!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value))return false;
 const ms=Date.parse(value);
 const local=value.slice(0,16);
 // Reject impossible dates, timezone-less values and future meals.
 const date=new Date(`${local}:00Z`);
 return Number.isFinite(ms)&&Number.isFinite(date.getTime())&&date.toISOString().slice(0,16)===local&&ms>=Date.UTC(2000,0,1)&&ms<=now+60000;
}
export function eatenTime(log:{eatenAt?:string|null;createdAt:string}){return log.eatenAt??log.createdAt;}
export const timePeriods=['새벽','오전','오후','저녁'] as const;
export function timePeriod(value:string){
 const hour=Number(mealTimeLocal(value).slice(11,13));
 return timePeriods[Math.floor(hour/6)];
}
export function mealTimeline<T extends {eatenAt?:string|null;createdAt:string}>(logs:T[]){
 const sorted=logs.slice().sort((a,b)=>Date.parse(eatenTime(a))-Date.parse(eatenTime(b)));
 return timePeriods.map(period=>({period,logs:sorted.filter(log=>timePeriod(eatenTime(log))===period)})).filter(group=>group.logs.length);
}

export const mealSlots=['breakfast','lunch','dinner','snack'] as const;
export type MealSlot=typeof mealSlots[number];
export const mealSlotLabels:Record<MealSlot,string>={breakfast:'아침',lunch:'점심',dinner:'저녁',snack:'간식'};
export function validMealSlot(value:unknown):value is MealSlot{return typeof value==='string'&&mealSlots.includes(value as MealSlot);}
export function inferredMealSlot(time:string):MealSlot{const hour=Number(mealTimeLocal(time).slice(11,13));return hour<11?'breakfast':hour<16?'lunch':'dinner';}
export function recordDestination(time:string,slot:MealSlot|null){const day=(time||mealTimeLocal()).slice(0,10),today=mealTimeLocal().slice(0,10);return `${day===today?'오늘':day} ${slot?mealSlotLabels[slot]:'식사'}`;}
export function mealGroups<T extends {mealSlot?:MealSlot|null;eatenAt?:string|null;createdAt:string}>(logs:T[]){return mealSlots.map(slot=>({period:mealSlotLabels[slot],logs:logs.filter(log=>(log.mealSlot??inferredMealSlot(eatenTime(log)))===slot).sort((a,b)=>Date.parse(eatenTime(a))-Date.parse(eatenTime(b)))})).filter(group=>group.logs.length);}
