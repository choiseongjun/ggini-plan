import {addDays} from './dashboard';

export function planDay(start:string,today:string,days:number){
 const offset=Math.round((Date.parse(`${today}T00:00:00Z`)-Date.parse(`${start}T00:00:00Z`))/86400000);
 return {day:Math.max(1,Math.min(days,offset+1)),active:offset>=0&&offset<days};
}
export function planDate(start:string,day:number){return addDays(start,day-1);}
export function validPlanDate(value:unknown):value is string{
 return typeof value==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
}
// Allocate recorded portions in schedule order when the same product occurs twice.
export function recordedForSlot(ids:string[],index:number,portions:number){
 const earlier=ids.slice(0,index).filter(id=>id===ids[index]).length;
 return Math.max(0,Math.min(1,portions-earlier));
}
export function remainingPlanPortions(entries:{id:string;date:string}[],today:string,logs:{productId:string;portions:number}[]){
 const eaten:Record<string,number>={},remaining:Record<string,number>={};
 for(const log of logs)eaten[log.productId]=(eaten[log.productId]??0)+log.portions;
 for(const {id,date} of entries){
  if(date<today)continue;
  const used=date===today?Math.min(1,eaten[id]??0):0;
  if(date===today)eaten[id]=Math.max(0,(eaten[id]??0)-used);
  remaining[id]=(remaining[id]??0)+1-used;
 }
 return remaining;
}
