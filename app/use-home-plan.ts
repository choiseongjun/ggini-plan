'use client';

import {useEffect,useState} from 'react';
import {cachedJson} from '../lib/client-cache';
import {parseConditions,type PlanConditions,type PlanProduct} from '../lib/shopping-plan';
import {remoteEngine} from './plan-engine';

export type HomePlan={conditions:PlanConditions;ids:string[];products:PlanProduct[]};

// Reads the plan the home screen is showing: the on-device draft first (same key the home planner writes), then the last saved plan.
function readDraft(userId?:string){
 const key=`kkiniplan-shopping-draft-v2-${userId??'guest'}`;
 try{return JSON.parse(localStorage.getItem(key)??sessionStorage.getItem(key)??'null');}catch{return null;}
}

export function useHomePlan(userId?:string){
 const [plan,setPlan]=useState<HomePlan|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 const [retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  cachedJson('/api/shopping-plan',{key:`/api/shopping-plan|${userId??'guest'}`,ttl:10*60_000}).then(async d=>{
   if(controller.signal.aborted)return;
   const draft=readDraft(userId)??d.plan;
   const conditions=parseConditions(draft?.conditions);
   const ids:string[]=Array.isArray(draft?.mealIds)?draft.mealIds.filter((id:unknown)=>typeof id==='string'&&id):[];
   // 전체 메뉴 목록 대신 이 식단에 든 메뉴만 받아 온다.
   const products=conditions&&ids.length?(await remoteEngine(()=>{}).products(ids)).products:[];
   if(controller.signal.aborted)return;
   setPlan(conditions&&ids.length?{conditions,ids,products}:null);setError('');
  }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'식단을 불러오지 못했어요.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[userId,retry]);
 return {plan,loading,error,reload:()=>{setLoading(true);setRetry(n=>n+1);}};
}
