import {readShoppingDraft} from './shopping-draft';

export const pendingPlanSaveKey='ggini-pending-adoption';
export function readPendingPlanSave(raw:string|null,now=Date.now()){
 const draft=readShoppingDraft(raw);
 if(!draft||draft.savedAt>now||now-draft.savedAt>86400000||draft.mealIds.length!==draft.conditions.meals||!draft.mealIds.every(Boolean))return null;
 let meta;try{meta=JSON.parse(raw!);}catch{return null;}
 return {...draft,returnTo:meta.returnTo==='/plan'?'/plan':'/next-meal',names:Array.isArray(meta.names)?meta.names.filter((n:unknown):n is string=>typeof n==='string').slice(0,3):[]};
}
export function pendingPlanSave(){
 try{return readPendingPlanSave(sessionStorage.getItem(pendingPlanSaveKey));}catch{return null;}
}
