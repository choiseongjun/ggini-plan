'use client';
import {useState} from 'react';
import {ProductThumb} from './product-thumb';
import {MealAlternatives} from './meal-alternatives';
import {usePlannerLocale} from './planner-locale';
import {mealSchedule,basketTotal,validMealIds,slotLabels,type PlanProduct,type PlanConditions} from '../lib/shopping-plan';
import './plan-builder.css';

export function PlanBuilder({ids,products,conditions,onChoose,disabled}:{ids:string[];products:PlanProduct[];conditions:PlanConditions;onChoose:(index:number,id:string)=>void;disabled:boolean}){
 const locale=usePlannerLocale();
 const won=locale.money;
 const [browsing,setBrowsing]=useState<number|null>(null);
 const schedule=mealSchedule(conditions);
 const days=conditions.days??Math.max(1,...schedule.map(s=>s.day));
 const filledCount=ids.filter(id=>products.some(p=>p.id===id)).length;
 const total=basketTotal(ids.filter(Boolean),products,conditions.owned,conditions.supply,conditions.people);
 const complete=ids.every(Boolean)&&validMealIds(ids,products,conditions);
 return <section className="plan-builder" aria-label="직접 식단 만들기">
  <header className="plan-builder-head"><strong>🛠 직접 식단 만들기</strong><p>끼니마다 원하는 메뉴를 직접 골라요 · {filledCount}/{conditions.meals}끼 완료</p></header>
  <div className="plan-builder-total"><span>지금까지 예상 금액</span><strong>{won(total)}</strong><small>{total>conditions.budget?`예산보다 ${won(total-conditions.budget)} 많아요`:`예산에서 ${won(conditions.budget-total)} 남아요`}</small></div>
  {Array.from({length:days},(_,i)=>i+1).map(day=><section className="plan-builder-day" key={day}><h3>🌱 {day}일차</h3>
   {schedule.flatMap((s,index)=>s.day===day?[{slot:s.slot,index}]:[]).map(({slot,index})=>{
    const product=products.find(p=>p.id===ids[index]);
    const open=browsing===index;
    return <article key={index} className="plan-builder-slot">
     <div className="plan-builder-slot-label">{slot==='breakfast'?'☀️':slot==='lunch'?'🌤️':'🌙'} {slotLabels[slot]}</div>
     {product
      ?<div className="plan-builder-picked"><ProductThumb item={product}/><div><strong>{product.name}</strong><span>한 끼 {product.recipe?'재료비 ':''}약 {won(product.price/product.servings)}</span></div><button type="button" disabled={disabled} aria-expanded={open} onClick={()=>setBrowsing(open?null:index)}>{open?'접기':'🔀 바꾸기'}</button></div>
      :<button type="button" className="plan-builder-empty" disabled={disabled} aria-expanded={open} onClick={()=>setBrowsing(open?null:index)}>🍽️ 메뉴를 골라주세요</button>}
     {open&&<MealAlternatives index={index} ids={ids} products={products} conditions={conditions} onChoose={(i,id)=>{onChoose(i,id);setBrowsing(null);}} disabled={disabled}/>}
    </article>;
   })}
  </section>)}
  {complete&&<p className="plan-builder-complete" role="status">🎉 식단을 다 완성했어요! 아래에서 저장하거나 커뮤니티에 올려 보세요.</p>}
 </section>;
}
