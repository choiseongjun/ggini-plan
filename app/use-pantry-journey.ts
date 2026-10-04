'use client';
import {useEffect,useState,useRef} from 'react';
import {journeyKey,parseJourney,todayMeal,mealDate,type PantryJourney,type PantryMeal} from '../lib/pantry-journey';
import {pantryToday} from '../lib/pantry-inventory';
import {trackAnalytics} from '../lib/analytics';
import type {PlanProduct} from '../lib/shopping-plan';

export function usePantryJourney(userId?:string){
 const key=journeyKey(userId);
 const [journey,setJourney]=useState<PantryJourney>({meals:[],favorites:[]});
 const [ready,setReady]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const locked=useRef(false);
 const revision=useRef(0);
 useEffect(()=>{
  const read=()=>{setJourney(parseJourney(localStorage.getItem(key)));setReady(true);};
  const safelyRead=()=>{try{read();}catch{setError('브라우저 저장 공간을 사용할 수 없어요.');setReady(true);}};
  const frame=requestAnimationFrame(safelyRead);
  window.addEventListener('storage',safelyRead);window.addEventListener('pantry-journey-changed',safelyRead);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('storage',safelyRead);window.removeEventListener('pantry-journey-changed',safelyRead);};
 },[key]);
 useEffect(()=>{
  if(!userId)return;
  let active=true;let request=0;const controller=new AbortController();
  const sync=async()=>{
   const currentRequest=++request, currentRevision=revision.current;
   try{
    const from=mealDate(new Date(Date.now()-30*86400000).toISOString()),to=pantryToday();
    const response=await fetch(`/api/food-intake?from=${from}&to=${to}`,{signal:controller.signal,cache:'no-store'});
    if(!response.ok||!active)return;
    const data=await response.json();if(!active||currentRequest!==request||currentRevision!==revision.current||locked.current||!Array.isArray(data.logs))return;
    const current=parseJourney(localStorage.getItem(key));
    const meals:PantryMeal[]=data.logs.filter((m:{productId:string})=>m.productId?.startsWith('source-')).map((m:{id:string;productId:string;name:string;eatenAt:string})=>({id:m.id,recipeId:m.productId,name:m.name,eatenAt:m.eatenAt,status:'saved'}));
    const next={...current,meals:[...current.meals.filter(m=>mealDate(m.eatenAt)<from||(m.status==='pending'&&!meals.some(s=>s.id===m.id))),...meals]};
    localStorage.setItem(key,JSON.stringify(next));setJourney(next);
   }catch{/* Existing local favorites remain usable while offline. */}
  };
  void sync();window.addEventListener('intake-logged',sync);window.addEventListener('shopping-progress-changed',sync);
  return()=>{active=false;controller.abort();window.removeEventListener('intake-logged',sync);window.removeEventListener('shopping-progress-changed',sync);};
 },[key,userId]);
 function persist(next:PantryJourney){localStorage.setItem(key,JSON.stringify(next));setJourney(next);window.dispatchEvent(new Event('pantry-journey-changed'));}
 function favorite(id:string){try{const current=parseJourney(localStorage.getItem(key));persist({...current,favorites:current.favorites.includes(id)?current.favorites.filter(v=>v!==id):[...current.favorites,id]});setError('');}catch{setError('취향을 저장하지 못했어요. 저장 공간을 확인해 주세요.');}}
 async function record(product:PlanProduct){
  if(locked.current||!ready||!product.sourceRecipe)return false;
  locked.current=true;revision.current++;setSaving(true);setError('');
  try{
   const current=parseJourney(localStorage.getItem(key));
   const existing=todayMeal(current.meals,product.id,pantryToday());
   if(existing?.status==='saved')return true;
   const meal:PantryMeal=existing??{id:crypto.randomUUID(),recipeId:product.id,name:product.name,eatenAt:new Date().toISOString(),status:'pending'};
   // Keep the request id before sending so a lost response can be retried without duplication.
   persist({...current,meals:[...current.meals.filter(m=>m.id!==meal.id),meal]});
   if(userId){
    const response=await fetch('/api/food-intake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'log',id:meal.id,version:0,productId:product.id,portions:1,extras:[],eatenAt:meal.eatenAt})});
    const data=await response.json();if(!response.ok||!data.saved)throw new Error(data.error??'식사 기록을 저장하지 못했어요. 다시 눌러주세요.');
   }
   const latest=parseJourney(localStorage.getItem(key));persist({...latest,meals:[...latest.meals.filter(m=>m.id!==meal.id),{...meal,status:'saved' as const}].slice(-365)});
   window.dispatchEvent(new Event('intake-logged'));trackAnalytics('meal_recorded',{method:'manual'});return true;
  }catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요. 다시 눌러주세요.');return false;}
  finally{locked.current=false;setSaving(false);}
 }
 function removeGuest(id:string){if(userId)return;try{const current=parseJourney(localStorage.getItem(key));persist({...current,meals:current.meals.filter(m=>m.id!==id)});}catch{setError('기록을 삭제하지 못했어요.');}}
 return {journey,ready,saving,error,record,favorite,removeGuest};
}
