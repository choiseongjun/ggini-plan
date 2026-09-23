'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {addDays} from '../lib/dashboard';
import {planDate} from '../lib/daily-plan';
import {servingNutrition} from '../lib/food-intake';
import {mealSchedule,purchaseBasket,slotLabels,type MealSlot,type PlanProduct} from '../lib/shopping-plan';
import {useHomePlan} from './use-home-plan';
import {ProductThumb} from './product-thumb';
import {MealSourceBadge} from './meal-source';
import './plan-calendar.css';

type Meal={index:number;slot:MealSlot;product:PlanProduct};
const won=(n:number)=>`${Math.round(n).toLocaleString('ko-KR')}원`;
const kstToday=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
const slotIcon:Record<MealSlot,string>={breakfast:'☀️',lunch:'🌤️',dinner:'🌙'};
const weekdays=['월','화','수','목','금','토','일'];
const mondayIndex=(date:string)=>(new Date(`${date}T00:00:00Z`).getUTCDay()+6)%7;

export function PlanCalendar({userId}:{userId?:string}){
 const weekly=usePathname()==='/calendar/week';
 const [today]=useState(kstToday);
 const {plan:state,loading,error,reload}=useHomePlan(userId);
 const [monthChoice,setMonth]=useState<string|null>(null);
 const [selected,setSelected]=useState<string|null>(null);
 const [weekAnchor,setWeekAnchor]=useState<string|null>(null);

 if(loading)return <section className="plan-calendar" aria-busy="true"><div className="plan-cal-skeleton"/></section>;
 if(error)return <section className="plan-calendar"><p className="auth-error" role="alert">{error} <button type="button" onClick={reload}>다시 불러오기</button></p></section>;
 if(!state)return <section className="plan-calendar"><div className="plan-cal-empty"><strong>아직 추천받은 식단이 없어요</strong><p>홈에서 예산에 맞는 식단을 추천받으면, 여기서 날짜별로 한눈에 볼 수 있어요.</p><Link className="primary-button" href="/">홈에서 식단 추천받기 →</Link></div></section>;

 const {conditions,ids,products}=state;
 const start=conditions.startDate??today;
 const schedule=mealSchedule(conditions);
 const byDate=new Map<string,Meal[]>();
 ids.forEach((id,index)=>{const product=products.find(p=>p.id===id);const s=schedule[index];if(!product||!s)return;const date=planDate(start,s.day);byDate.set(date,[...(byDate.get(date)??[]),{index,slot:s.slot,product}]);});
 const dates=[...byDate.keys()].sort();
 const first=dates[0]??start,last=dates.at(-1)??start;
 const active=selected&&byDate.has(selected)?selected:byDate.has(today)?today:first;
 // Open on the month holding today's meals, or the plan's first month.
 const month=monthChoice??(byDate.has(today)?today:first).slice(0,7);
 const meals=byDate.get(active)??[];
 const cost=purchaseBasket(ids,products,conditions.owned,conditions.supply,undefined,conditions.people).reduce((sum,r)=>sum+r.cost,0);
 const dayKcal=meals.reduce((sum,m)=>sum+(servingNutrition(m.product).calories??0),0);
 const dayCost=meals.reduce((sum,m)=>sum+m.product.price/m.product.servings,0);

 // Month grid (or the week around the selected day on /calendar/week).
 const monthStart=`${month}-01`;
 const daysInMonth=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).getUTCDate();
 const cells:(string|null)[]=weekly
  ?Array.from({length:7},(_,i)=>addDays(addDays(weekAnchor??active,-mondayIndex(weekAnchor??active)),i))
  :[...Array(mondayIndex(monthStart)).fill(null),...Array.from({length:daysInMonth},(_,i)=>addDays(monthStart,i))];
 const shiftMonth=(delta:number)=>{const d=new Date(`${monthStart}T00:00:00Z`);d.setUTCMonth(d.getUTCMonth()+delta);setMonth(d.toISOString().slice(0,7));};
 const fmt=(date:string)=>`${Number(date.slice(5,7))}월 ${Number(date.slice(8))}일`;

 return <section className="plan-calendar" aria-label="홈에서 고른 식단 달력">
  <header className="plan-cal-head">
   <div><span className="plan-cal-kicker">홈에서 고른 식단</span><h2>{fmt(first)} – {fmt(last)}</h2><p>{dates.length}일 · {ids.length}끼 · 장보기 약 {won(cost)}</p></div>
   <Link href="/" className="plan-cal-edit">식단 바꾸기</Link>
  </header>
  <nav className="meal-period-links" aria-label="식단 기간별 보기"><Link href="/calendar/week" aria-current={weekly?'page':undefined}>주간 보기</Link><Link href="/calendar" aria-current={!weekly?'page':undefined}>월간 보기</Link></nav>

  <div className={`plan-cal-card${weekly?' weekly-cal':''}`}>
   {weekly
    ?<div className="plan-cal-nav"><button type="button" aria-label="이전 주" onClick={()=>setWeekAnchor(addDays(cells[0]!,-7))}>‹</button><strong>{fmt(cells[0]!)} – {fmt(cells[6]!)}</strong><button type="button" aria-label="다음 주" onClick={()=>setWeekAnchor(addDays(cells[0]!,7))}>›</button></div>
    :<div className="plan-cal-nav"><button type="button" aria-label="이전 달" onClick={()=>shiftMonth(-1)}>‹</button><strong>{Number(month.slice(0,4))}년 {Number(month.slice(5))}월</strong><button type="button" aria-label="다음 달" onClick={()=>shiftMonth(1)}>›</button></div>}
   <div className="plan-cal-grid" role="group" aria-label="식단 날짜">
    {weekdays.map(w=><span key={w} className="plan-cal-weekday" aria-hidden="true">{w}</span>)}
    {cells.map((date,i)=>{
     if(!date)return <span key={`blank-${i}`}/>;
     const dayMeals=byDate.get(date);
     return <button type="button" key={date} disabled={!dayMeals} aria-pressed={date===active} aria-label={`${fmt(date)}${dayMeals?` · ${dayMeals.length}끼`:' · 식단 없음'}`}
      className={`plan-cal-day${dayMeals?' has-meals':''}${date===today?' is-today':''}`} onClick={()=>setSelected(date)}>
      <span className="plan-cal-date">{Number(date.slice(8))}</span>
      {dayMeals&&<span className="plan-cal-thumbs" aria-hidden="true">{dayMeals.slice(0,weekly?3:1).map(m=><ProductThumb key={m.index} item={m.product}/>)}</span>}
      {dayMeals&&<span className="plan-cal-dots" aria-hidden="true">{dayMeals.map(m=><i key={m.index}/>)}</span>}
     </button>;
    })}
   </div>
   {!weekly&&!dates.some(d=>d.startsWith(month))&&<p className="plan-cal-note">이 달에는 식단이 없어요. <button type="button" onClick={()=>{setMonth(first.slice(0,7));setSelected(first);}}>식단 있는 달로 이동</button></p>}
  </div>

  <section className="plan-cal-day-detail" aria-label="선택한 날 식단">
   <div className="plan-cal-day-title"><h3>{active===today?'오늘':fmt(active)} 식단</h3><span>{meals.length}끼 · 약 {Math.round(dayKcal).toLocaleString('ko-KR')}kcal · {won(dayCost)}</span></div>
   {meals.map(m=>{const kcal=servingNutrition(m.product).calories;return <article key={m.index} className="plan-cal-meal">
    <ProductThumb item={m.product}/>
    <div><small>{slotIcon[m.slot]} {slotLabels[m.slot]}</small><MealSourceBadge product={m.product}/><h4>{m.product.name}</h4><p>한 끼 약 {won(m.product.price/m.product.servings)}{kcal!==null?` · ${Math.round(kcal)}kcal`:''}</p></div>
   </article>;})}
   <Link href="/" className="plan-cal-home">홈에서 메뉴 바꾸기·먹었어요 기록 →</Link>
  </section>
 </section>;
}
