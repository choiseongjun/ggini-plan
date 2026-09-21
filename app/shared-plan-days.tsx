'use client';
import {ProductThumb} from './product-thumb';
import {slotLabels} from '../lib/shopping-plan';
import type {SharedPlan} from '../lib/shared-plan';
import './shared-plan.css';
const won=(n:number)=>`${Math.round(n).toLocaleString('ko-KR')}원`;
export function SharedPlanDays({plan}:{plan:SharedPlan}){
 return <>{Array.from({length:plan.days},(_,i)=>i+1).map(day=><section className="shared-day" key={day}><h2>🌱 {day}일차</h2>{plan.meals.filter(m=>m.day===day).map((meal,index)=>{const p=plan.products.find(p=>p.id===meal.productId)!;return <article key={index}><ProductThumb item={{productImageUrl:p.image,emoji:'🍽️',color:''}}/><div><small>{slotLabels[meal.slot]} · 영양·가격 1인분 기준</small><h3>{p.name}</h3><strong>한 끼 약 {won(p.price/p.servings)}</strong><p>{p.calories===null?'칼로리 미확인':`${Math.round(p.calories)} kcal`} · 단백질 {p.protein===null?'미확인':`${p.protein} g`}</p>{p.url&&<a href={p.url} target="_blank" rel="noopener noreferrer">판매처에서 보기 ↗</a>}</div></article>;})}</section>)}</>;
}
