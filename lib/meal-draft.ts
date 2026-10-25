import type {FoodReference} from './food-reference';
export type PhotoMealItem={id:string;name:string;originalName:string;food:FoodReference|null;portions:number};
export type MealDraft={id:string;owner:string;photo:Blob;createdAt:string;food?:FoodReference;portions?:number;photoItems?:PhotoMealItem[];photoMealSlot?:import('./meal-time').MealSlot;photoSavePending?:boolean};
const DB='kkini-meal-drafts';
function open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{
 const request=indexedDB.open(DB,1);
 request.onupgradeneeded=()=>request.result.createObjectStore('drafts',{keyPath:'owner'});
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
});}
export async function readMealDraft(owner:string):Promise<MealDraft|null>{
 const db=await open();try{return await new Promise((resolve,reject)=>{const r=db.transaction('drafts').objectStore('drafts').get(owner);r.onsuccess=()=>resolve(r.result??null);r.onerror=()=>reject(r.error);});}finally{db.close();}
}
export async function writeMealDraft(draft:MealDraft){
 const db=await open();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(draft);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
}
// Never remove a newer draft after an older request completes.
export async function deleteMealDraft(owner:string,id:string){
 const db=await open();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('drafts','readwrite'),store=tx.objectStore('drafts'),r=store.get(owner);r.onsuccess=()=>{if(r.result?.id===id)store.delete(owner);};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}
}
