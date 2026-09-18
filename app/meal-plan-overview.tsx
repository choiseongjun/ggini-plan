"use client";
import {useEffect,useId,useRef,useState} from 'react';
import Link from 'next/link';
import {mealSchedule,slotLabels,type PlanProduct,type PlanConditions} from '../lib/shopping-plan';
import {planDate} from '../lib/daily-plan';
import {ProductThumb} from './product-thumb';
import {usePlannerLocale} from './planner-locale';
import './meal-plan-overview.css';

export function MealPlanOverview({ids,products,conditions,startDate,shoppingTotal,onDay}:{ids:string[];products:PlanProduct[];conditions:PlanConditions;startDate:string;shoppingTotal:number;onDay:(day:number)=>void}){
 const [open,setOpen]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);
 const titleId=useId();
 const locale=usePlannerLocale();
 const schedule=mealSchedule(conditions);
 const days=conditions.days??Math.max(1,...schedule.map(s=>s.day));
 useEffect(()=>{
  if(!open)return;
  const node=dialog.current;
  const previous=document.body.style.overflow;
  node?.showModal();document.body.style.overflow='hidden';
  return()=>{node?.close();document.body.style.overflow=previous;};
 },[open]);
 return <><button type="button" className="meal-overview-trigger" onClick={()=>setOpen(true)}>🗓️ 전체 식단 한눈에 보기 <span>{days}일 · {ids.length}끼 →</span></button>
 <dialog ref={dialog} className="meal-overview" aria-labelledby={titleId} onCancel={()=>setOpen(false)} onClose={()=>setOpen(false)} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)setOpen(false);}}}>
  <header className="meal-overview-header"><div><small>🧺 차곡차곡 준비한 끼니</small><h2 id={titleId}>전체 식단 한눈에 보기</h2></div><button type="button" aria-label="전체 식단 닫기" onClick={()=>setOpen(false)}>✕</button></header>
  <div className="meal-overview-scroll"><div className="meal-overview-summary"><span>{days}일 · {ids.length}끼</span><strong>추가 장보기 약 {locale.money(shoppingTotal)}</strong><small>판매 묶음 기준 · 배송비 별도</small></div>
   <p className="meal-overview-hint">메뉴를 누르면 해당 날짜의 자세한 식단으로 돌아가요.</p>
   <div className="meal-overview-days">{Array.from({length:days},(_,i)=>i+1).map(day=><section key={day} className="meal-overview-day"><h3><span>{day}일차</span><time dateTime={planDate(startDate,day)}>{planDate(startDate,day).slice(5).replace('-','/')}</time></h3>{ids.flatMap((id,index)=>{if(schedule[index]?.day!==day)return [];const p=products.find(p=>p.id===id);return [<button type="button" key={index} className="meal-overview-item" onClick={()=>{setOpen(false);onDay(day);}}>{p&&<ProductThumb item={p}/>}<span><small>{slotLabels[schedule[index].slot]}</small><b>{p?.name??'상품 정보 확인 중'}</b><em>{p?`한 끼 약 ${locale.money(p.price/p.servings)}`:'가격 미확인'}</em></span><span aria-hidden="true">›</span></button>];})}</section>)}</div>
   <p className="meal-overview-hint">한 끼 가격은 먹는 양 기준의 예상 비용이에요. 추가 장보기 금액은 주문·보유 수량과 판매 묶음을 반영해 달라질 수 있어요.</p>
  </div><footer className="meal-overview-footer"><Link href="/cart" onClick={()=>setOpen(false)}>🛍️ 장보기 목록 보기 →</Link></footer>
 </dialog></>;
}
