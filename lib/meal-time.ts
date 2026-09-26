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
