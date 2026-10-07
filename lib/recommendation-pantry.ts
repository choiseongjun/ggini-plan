import {canonicalIngredient,isWater} from './ingredient-canonical';
import {mergePantryEntries,pantryForRecommendation,restorePantry} from './pantry-inventory';
import type {PlanProduct} from './shopping-plan';

export const pendingPantryKey='ggini-pending-recommendation-pantry-v1';
export type PantrySelection={names:string[];savedAt:number};
export function rememberPantrySelection(names:string[]){sessionStorage.setItem(pendingPantryKey,JSON.stringify({names,savedAt:Date.now()}));}
export function recommendationIngredients(product:PlanProduct){
 return [...new Set((product.recipe?.ingredients??[]).map(i=>canonicalIngredient(i.product.name)).filter(n=>n&&!isWater(n)))];
}
export function parsePantrySelection(raw:string|null,now=Date.now()):PantrySelection|null{
 try{
  const value=JSON.parse(raw??'null');
  if(!value||!Number.isFinite(value.savedAt)||value.savedAt>now||now-value.savedAt>30*60_000||!Array.isArray(value.names)||!value.names.length||value.names.length>100||value.names.some((n:unknown)=>typeof n!=='string'||!n.trim()||n.length>50))return null;
  const names=[...new Set<string>(value.names.map(canonicalIngredient))].filter(n=>n&&!isWater(n));
  return names.length?{names,savedAt:value.savedAt}:null;
 }catch{return null;}
}
export function pendingPantrySelection(){
 try{return parsePantrySelection(sessionStorage.getItem(pendingPantryKey));}catch{return null;}
}
// Read the latest account inventory before every merge; never replace it with a guest snapshot.
export async function saveRecommendationPantry(userId:string,names:string[],request:typeof fetch=fetch){
 for(let attempt=0;attempt<2;attempt++){
  const response=await request('/api/pantry/inventory',{cache:'no-store',signal:AbortSignal.timeout(15000)});
  const data=await response.json();
  if(!response.ok||data.userId!==userId)throw new Error('내 재료를 불러오지 못했어요. 로그인 상태를 확인하고 다시 시도해 주세요.');
  const inventory=mergePantryEntries(restorePantry(data.inventory),names.map(name=>({name})));
  const owned=new Set(pantryForRecommendation(inventory).owned);
  if(names.some(name=>!owned.has(canonicalIngredient(name))))throw new Error('내 재료 목록이 가득 찼어요. 내 재료에서 정리한 뒤 다시 저장해 주세요.');
  const saved=await request('/api/pantry/inventory',{method:'PUT',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({userId,inventory,version:data.version,requestId:crypto.randomUUID()})});
  if(saved.status===409&&attempt===0)continue;
  const result=await saved.json();
  if(!saved.ok||result.userId!==userId)throw new Error(result.error??'재료를 저장하지 못했어요. 다시 시도해 주세요.');
  return;
 }
}
