import {validPortions} from './food-intake';
import {validMealSlot,type MealSlot} from './meal-time';

export type MealReuseRequest={id:string;owner:string;source:string;items:{id:string;portions:number}[];eatenAt:string;mealSlot:MealSlot};
type Storage=Pick<globalThis.Storage,'getItem'|'setItem'|'removeItem'>;
export const mealReuseStorageKey=(owner:string)=>`ggini-pending-meal-reuse:${encodeURIComponent(owner)}`;
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
function cleanRequest(value:MealReuseRequest):MealReuseRequest{
 // Keep identity and quantities, never photos, food names or nutrient values.
 return {id:value.id,owner:value.owner,source:value.source,items:value.items.map(({id,portions})=>({id,portions})),eatenAt:value.eatenAt,mealSlot:value.mealSlot};
}
export function parsePendingMealReuse(raw:string,owner:string):MealReuseRequest{
 const v=JSON.parse(raw);
 if(v?.version!==1||v.owner!==owner||!uuid(v.id)||!uuid(v.source)||!Array.isArray(v.items)||!v.items.length||v.items.length>10||
  !v.items.every((item:{id?:unknown;portions?:unknown})=>item&&uuid(item.id)&&validPortions(item.portions))||
  new Set(v.items.map((item:{id:string})=>item.id)).size!==v.items.length||typeof v.eatenAt!=='string'||!Number.isFinite(Date.parse(v.eatenAt))||!validMealSlot(v.mealSlot)){
  throw new Error('이 기기의 저장 확인 정보를 읽지 못했어요. 식사 일기에서 저장 여부를 먼저 확인해 주세요.');
 }
 return cleanRequest(v);
}
export function readPendingMealReuse(storage:Storage,owner:string){
 const raw=storage.getItem(mealReuseStorageKey(owner));return raw===null?null:parsePendingMealReuse(raw,owner);
}
export function rememberMealReuse(storage:Storage,request:MealReuseRequest){
 // Another mount/tab may already have an uncertain save. Resolve it before making a new id.
 const existing=readPendingMealReuse(storage,request.owner);
 if(existing&&existing.id!==request.id)throw new Error('확인이 필요한 이전 저장이 있어요. 최근 식사를 다시 열어 확인해 주세요.');
 const raw=JSON.stringify({version:1,...cleanRequest(request)});parsePendingMealReuse(raw,request.owner);
 storage.setItem(mealReuseStorageKey(request.owner),raw);
 if(storage.getItem(mealReuseStorageKey(request.owner))!==raw)throw new Error('저장 확인 정보를 보관하지 못했어요. 기기의 저장 공간을 확인해 주세요.');
}
export function clearPendingMealReuse(storage:Storage,owner:string,id:string){
 if(readPendingMealReuse(storage,owner)?.id===id)storage.removeItem(mealReuseStorageKey(owner));
}
