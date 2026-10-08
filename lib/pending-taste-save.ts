export const tasteSaveKey='ggini-pending-taste-save-v1';
export type TasteSave={id:string;name:string;day:string;slot:'dinner';at:number;returnTo?:string;};
export function parseTasteSave(raw:string|null,now=Date.now()):TasteSave|null{
 try{const v=JSON.parse(raw??'null');
  if(!v||typeof v.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.id)||typeof v.name!=='string'||!v.name.trim()||v.name.length>80||typeof v.day!=='string'||!/^20\d\d-\d\d-\d\d$/.test(v.day)||!Number.isFinite(Date.parse(v.day))||v.slot!=='dinner'||!Number.isFinite(v.at)||v.at>now||now-v.at>30*60_000)return null;
  if(new Date(v.day).toISOString().slice(0,10)!==v.day)return null;
  const returnTo=typeof v.returnTo==='string'&&v.returnTo.length<400&&/^\/(?:taste)?(?:\?[^#]*)?$/.test(v.returnTo)?v.returnTo:undefined;
  return {id:v.id,name:v.name,day:v.day,slot:'dinner',at:v.at,...(returnTo?{returnTo}:{})};
 }catch{return null;}
}
export function pendingTasteReturn(){try{const draft=parseTasteSave(sessionStorage.getItem(tasteSaveKey));return draft?(draft.returnTo??'/taste'):null;}catch{return null;}}
