'use client';

import Link from 'next/link';
import {useEffect,useId,useRef} from 'react';
import {planDate} from '../lib/daily-plan';
import {slotLabels,type MealSlot} from '../lib/shopping-plan';
import type {WeekAnalysis} from '../lib/week-analysis';
import {ProductThumb} from './product-thumb';
import {MealSourceBadge} from './meal-source';
import './week-plan-modal.css';

const n=(v:number)=>Math.round(v).toLocaleString('ko-KR');
const weekday=['일','월','화','수','목','금','토'];
const slotTone:Record<MealSlot,string>={breakfast:'is-morning',lunch:'is-noon',dinner:'is-evening'};

export function WeekPlanModal({open,onClose,analysis,startDate}:{open:boolean;onClose:()=>void;analysis:WeekAnalysis;startDate:string}){
 const dialog=useRef<HTMLDialogElement>(null);
 const scroller=useRef<HTMLDivElement>(null);
 const titleId=useId();
 useEffect(()=>{
  const node=dialog.current;
  if(!open||!node)return;
  const previous=document.body.style.overflow;
  node.showModal();document.body.style.overflow='hidden';
  return()=>{node.close();document.body.style.overflow=previous;};
 },[open]);
 const jump=(day:number)=>scroller.current?.querySelector(`[data-day="${day}"]`)?.scrollIntoView({behavior:'smooth',block:'start'});
 const totalMeals=analysis.days.reduce((sum,d)=>sum+d.meals.length,0);

 return <dialog ref={dialog} className="week-plan-modal" aria-labelledby={titleId} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
  {open&&<div className="wpm-sheet">
   <header className="wpm-head">
    <div className="wpm-head-row"><div><span className="wpm-kicker">홈에서 고른 식단</span><h2 id={titleId}>{analysis.days.length}일 · {totalMeals}끼 한눈에 보기</h2></div><button type="button" className="wpm-close" aria-label="닫기" onClick={onClose}>✕</button></div>
    <nav className="wpm-days" aria-label="날짜로 이동">{analysis.days.map(d=>{const date=planDate(startDate,d.day);return <button type="button" key={d.day} onClick={()=>jump(d.day)}><small>{weekday[new Date(`${date}T00:00:00Z`).getUTCDay()]}</small><b>{Number(date.slice(8))}</b></button>;})}</nav>
   </header>
   <div className="wpm-scroll" ref={scroller}>
    {analysis.days.map((d,i)=>{
     const date=planDate(startDate,d.day);
     const over=d.intake-analysis.dailyGoal;
     return <section key={d.day} data-day={d.day} className="wpm-day" style={{'--i':i} as React.CSSProperties}>
      <div className="wpm-day-head">
       <div><span className="wpm-day-badge">{d.day}일차</span><strong>{Number(date.slice(5,7))}월 {Number(date.slice(8))}일 ({weekday[new Date(`${date}T00:00:00Z`).getUTCDay()]})</strong></div>
       <span className={`wpm-day-kcal ${Math.abs(over)<=analysis.dailyGoal*.1?'is-ok':over>0?'is-over':'is-under'}`}>{n(d.intake)}kcal</span>
      </div>
      {d.meals.map((m,j)=><article key={j} className={`wpm-meal ${slotTone[m.slot]}`}>
       <ProductThumb item={m.product}/>
       <div className="wpm-meal-body">
        <span className="wpm-slot">{slotLabels[m.slot]}</span>
        <h3>{m.product.name}</h3>
        <div className="wpm-meal-meta"><MealSourceBadge product={m.product}/><span>{n(m.product.price/m.product.servings)}원</span></div>
        <ul className="wpm-nutri" aria-label="1인분 영양">
         <li><b>{m.n.calories===null?'—':n(m.n.calories)}</b>kcal</li>
         <li className="p"><b>{m.n.protein===null?'—':n(m.n.protein)}</b>g 단백질</li>
         <li className="c"><b>{m.n.carbs===null?'—':n(m.n.carbs)}</b>g 탄수</li>
         <li className="f"><b>{m.n.fat===null?'—':n(m.n.fat)}</b>g 지방</li>
        </ul>
       </div>
      </article>)}
      {d.assumed>0&&<p className="wpm-assumed">나머지 끼니는 목표량 {n(d.assumed)}kcal로 계산했어요</p>}
     </section>;
    })}
   </div>
   <footer className="wpm-foot"><Link href="/" onClick={onClose}>홈에서 메뉴 바꾸기 →</Link></footer>
  </div>}
 </dialog>;
}
