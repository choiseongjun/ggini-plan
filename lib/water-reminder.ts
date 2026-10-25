export const DEFAULT_WATER_TIMES = ['10:00','14:00','18:00'];
export function parseWaterReminder(value: unknown): {enabled:boolean;times:string[]}|null {
  if (!value || typeof value !== 'object') return null;
  const v=value as Record<string,unknown>;
  if(typeof v.enabled!=='boolean'||!Array.isArray(v.times)||v.times.length<1||v.times.length>6)return null;
  if(v.times.some(t=>typeof t!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))return null;
  const times=[...v.times as string[]].sort(),minutes=times.map(t=>Number(t.slice(0,2))*60+Number(t.slice(3)));
  if(minutes.some((m,i)=>m<360||m>1320||(i>0&&m-minutes[i-1]<60)))return null;
  return {enabled:v.enabled,times};
}
export function dueWaterTimes(times:string[],now=new Date()) {
  const kst=new Date(now.getTime()+9*3600000),minute=kst.getUTCHours()*60+kst.getUTCMinutes();
  return {day:kst.toISOString().slice(0,10),times:times.filter(t=>{const diff=minute-Number(t.slice(0,2))*60-Number(t.slice(3));return diff>=0&&diff<30;})};
}
export function waterReminderBody(ml:number,goal:number|null){
  const amount=(ml/1000).toLocaleString('ko-KR',{maximumFractionDigits:2});
  return `오늘 기록한 물은 ${amount} L예요.${goal!==null?` 내가 정한 목표는 ${(goal/1000).toLocaleString('ko-KR')} L예요.`:''} 물을 마셨다면 기록해 주세요.`;
}
