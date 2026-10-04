'use client';

import {useEffect,useState} from 'react';
import {parseConditions,mealSchedule} from '../lib/shopping-plan';
import {planDate,validPlanDate} from '../lib/daily-plan';
import {pantryToday} from '../lib/pantry-inventory';

type Summary={meals:number;start:string|null;end:string|null};
export function HomeSavedPlan({userId,onOpen}:{userId:string;onOpen:()=>void}){
 const [state,setState]=useState<{userId:string;summary:Summary|null;error:boolean}|null>(null);
 const [revision,setRevision]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/shopping-plan?saved=1',{cache:'no-store',signal:controller.signal}).then(async response=>{
   if(!response.ok)throw Error('load');
   const {plan}=await response.json();
   const conditions=parseConditions(plan?.conditions);
   if(plan&&!conditions)throw Error('invalid');
   const meals=Array.isArray(plan?.mealIds)?plan.mealIds.filter((id:unknown)=>typeof id==='string'&&id.length>0).length:0;
   const start=conditions&&validPlanDate(conditions.startDate)?conditions.startDate:null;
   const schedule=conditions?mealSchedule(conditions):[];
   const end=start&&schedule.length?planDate(start,schedule[schedule.length-1].day):null;
   if(!controller.signal.aborted)setState({userId,summary:meals?{meals,start,end}:null,error:false});
  }).catch(()=>{if(!controller.signal.aborted)setState({userId,summary:null,error:true});});
  return()=>controller.abort();
 },[userId,revision]);
 if(state?.userId!==userId)return <p className="welcome-plan-status" role="status">저장한 식단을 확인하고 있어요…</p>;
 if(state.error)return <p className="welcome-plan-status" role="status">저장한 식단을 불러오지 못했어요. <button type="button" onClick={()=>setRevision(v=>v+1)}>다시 확인</button></p>;
 if(!state.summary)return null;
 const {meals,start,end}=state.summary;
 const past=!!end&&end<pantryToday();
 return <section className="welcome-resume" aria-label="저장한 식단 이어보기">
  <div><span>{past?'지난 식단도 다시 볼 수 있어요':'다시 고를 필요 없이'}</span><h3>{past?'최근 저장한 식단':'내가 저장한 식단'}</h3><p>{start&&end?`${start.slice(5).replace('-','/')} – ${end.slice(5).replace('-','/')} · `:''}{meals}끼 계획</p></div>
  <button type="button" onClick={onOpen}>식단·장보기 보기 <span aria-hidden="true">→</span></button>
 </section>;
}
