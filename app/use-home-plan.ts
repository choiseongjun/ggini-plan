'use client';
import {useEffect,useState} from 'react';
import {parseConditions,type PlanConditions,type PlanProduct} from '../lib/shopping-plan';
import {remoteEngine} from './plan-engine';
export type HomePlan={conditions:PlanConditions;ids:string[];products:PlanProduct[]};
export function useHomePlan(userId?:string){
 const [plan,setPlan]=useState<HomePlan|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [retry,setRetry]=useState(0);
 useEffect(()=>{
  let alive=true,revision=0;
  let controller:AbortController|undefined;
  const key=`kkiniplan-shopping-draft-v2-${userId??'guest'}`;
  const load=async()=>{
   const request=++revision;controller?.abort();controller=new AbortController();
   setLoading(true);setError('');
   try{
    let draft;
    try{draft=JSON.parse(localStorage.getItem(key)??sessionStorage.getItem(key)??'null');}catch{}
    if(!draft){
     const response=await fetch('/api/shopping-plan',{cache:'no-store',signal:controller.signal});
     if(!response.ok)throw new Error('식단을 불러오지 못했어요.');
     draft=(await response.json()).plan;
    }
    const conditions=parseConditions(draft?.conditions);
    const ids:string[]=Array.isArray(draft?.mealIds)?draft.mealIds.filter((id:unknown)=>typeof id==='string'&&id):[];
    const products=conditions&&ids.length?(await remoteEngine(()=>{}).products(ids)).products:[];
    if(alive&&request===revision)setPlan(conditions&&ids.length?{conditions,ids,products}:null);
   }catch(e){if(alive&&request===revision)setError(e instanceof Error?e.message:'식단을 불러오지 못했어요.');}
   finally{if(alive&&request===revision)setLoading(false);}
  };
  const changed=(event:Event)=>{if((event as CustomEvent).detail?.key===key)void load();};
  const stored=(event:StorageEvent)=>{if(event.key===key||event.key===null)void load();};
  const visible=()=>{if(!document.hidden)void load();};
  void load();
  window.addEventListener('home-plan-changed',changed);window.addEventListener('storage',stored);document.addEventListener('visibilitychange',visible);
  return()=>{alive=false;controller?.abort();window.removeEventListener('home-plan-changed',changed);window.removeEventListener('storage',stored);document.removeEventListener('visibilitychange',visible);};
 },[userId,retry]);
 return {plan,loading,error,reload:()=>setRetry(n=>n+1)};
}