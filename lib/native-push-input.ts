export type MealTimes = Partial<Record<'breakfast'|'lunch'|'dinner',string>>;
export const DEFAULT_NATIVE_TIMES:MealTimes={lunch:'12:00',dinner:'18:30'};
// 비회원 설치자: 앱이 숫자 id만 받으므로 '0'으로 표시하고, 하루 한 번 저녁에만 알린다.
export const GUEST_ID='0';
export const GUEST_NATIVE_TIMES:MealTimes={dinner:'18:30'};
export function parseNativeTimes(value:unknown):MealTimes|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const entries=Object.entries(value);
 if(entries.some(([key,time])=>!['breakfast','lunch','dinner'].includes(key)||typeof time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)))return null;
 return Object.fromEntries(entries);
}
export function nativeInput(value:unknown){
 if(!value||typeof value!=='object')return null;
 const v=value as Record<string,unknown>;
 if(typeof v.deviceId!=='string'||!/^[a-f0-9]{64}$/.test(v.deviceId)||typeof v.expectedUserId!=='string'||!/^\d+$/.test(v.expectedUserId))return null;
 if(!['sync','status','settings','enable','disable','test'].includes(String(v.action)))return null;
 if(v.action==='sync'&&(typeof v.permissionGranted!=='boolean'||(v.permissionGranted&&(typeof v.token!=='string'||!/^[-\w:]{80,4096}$/.test(v.token)))))return null;
 // 'enable' is the switch in the in-app reminder card: it is saved as settings with enabled=true.
 if(v.action==='enable'){const times=parseNativeTimes(v.times);return {deviceId:v.deviceId,expectedUserId:v.expectedUserId,action:'settings',token:undefined,permissionGranted:undefined,times:times&&Object.keys(times).length?times:DEFAULT_NATIVE_TIMES,enabled:true};}
 const times=v.action==='settings'?parseNativeTimes(v.times):undefined;
 if(v.action==='settings'&&(!times||typeof v.enabled!=='boolean'))return null;
 return {deviceId:v.deviceId,expectedUserId:v.expectedUserId,action:String(v.action),token:v.token as string|undefined,permissionGranted:v.permissionGranted as boolean|undefined,times,enabled:v.enabled as boolean|undefined};
}
export function dueNativeSlots(times:MealTimes,now=new Date()){
 const kst=new Date(now.getTime()+9*3600000),minute=kst.getUTCHours()*60+kst.getUTCMinutes();
 const day=kst.toISOString().slice(0,10);
 return Object.entries(times).flatMap(([slot,time])=>{
  if(!time||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return [];
  const [h,m]=time.split(':').map(Number),diff=minute-h*60-m;
  return diff>=0&&diff<60?[{slot:slot as keyof MealTimes,day}]:[];
 });
}
