'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import Link from 'next/link';
import type {PlanProduct} from '../lib/shopping-plan';
import {MealPhotoGallery,MealCompositionPhotos} from './meal-photo-gallery';
import {RecipeProductPreview} from './meal-source';
import {ProductNutrition} from './recommendation-nutrition';
import {RiceBuddy} from './rice-buddy';
import {shiftDay} from '../lib/weekly-feedback';
import './next-week-menu-modal.css';
export type NextWeekMeal={product?:PlanProduct;day:number;slotLabel:string;name:string;id:string;image?:string|null;nutrition?:{calories:number|null;protein:number|null}};
const weekdays=['일','월','화','수','목','금','토'];
export function NextWeekMenuModal({open,onClose,startDate,meals,onSave,saving,saved,error}:{open:boolean;onClose:()=>void;startDate:string;meals:NextWeekMeal[];onSave:()=>void;saving:boolean;saved:boolean;error:string}){
 const ref=useRef<HTMLDialogElement>(null),title=useId();
 const scroller=useRef<HTMLDivElement>(null);
 const jump=(day:number)=>scroller.current?.querySelector(`[data-next-day="${day}"]`)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 useEffect(()=>{const node=ref.current;if(!open||!node)return;const previous=document.body.style.overflow;const focus=document.activeElement;node.showModal();document.body.style.overflow='hidden';return()=>{node.close();document.body.style.overflow=previous;if(focus instanceof HTMLElement&&focus.isConnected)focus.focus();};},[open]);
 if(!open)return null;
 return createPortal(<dialog ref={ref} className="next-week-menu-modal" aria-labelledby={title} onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
  <div className="nw-sheet">
   <header className="nw-header"><button type="button" className="nw-close" aria-label="다음 주 메뉴 닫기" onClick={onClose}>✕</button><div className="nw-intro"><div><span className="nw-kicker">끼니가 준비한 다음 주</span><h2 id={title}>다음 주도<br/>맛있게 잘 챙겨요!</h2><p>{startDate.slice(5).replace('-','/')} – {shiftDay(startDate,6).slice(5).replace('-','/')} · 7일 {meals.length}끼</p></div><RiceBuddy/></div>
   <nav className="nw-days" aria-label="다음 주 날짜 선택">{Array.from({length:7},(_,i)=>{const value=shiftDay(startDate,i);return <button type="button" key={value} aria-label={`${value} 메뉴 보기`} onClick={()=>jump(i+1)}><span>{weekdays[new Date(`${value}T00:00:00Z`).getUTCDay()]}</span><b>{Number(value.slice(8))}</b><i aria-hidden="true">{'·'}</i></button>;})}</nav>
   </header>
   <div className="nw-content" ref={scroller}>{Array.from({length:7},(_,index)=>{const day=index+1,date=shiftDay(startDate,index),items=meals.filter(meal=>meal.day===day);return <section className="nw-day-section" data-next-day={day} key={date}><div className="nw-day-title"><h3>{Number(date.slice(5,7))}월 {Number(date.slice(8))}일의 식탁</h3><span>{items.length}끼 준비 완료</span></div>
    {items.map((meal,i)=><article className={`nw-meal nw-${meal.slotLabel==='아침'?'morning':meal.slotLabel==='점심'?'noon':'evening'}`} key={`${meal.id}-${i}`}>
     <div className="nw-meal-overview"><div className="nw-photo"><span aria-hidden="true">{meal.slotLabel==='아침'?'☀':meal.slotLabel==='점심'?'✿':'☾'}</span>{meal.image&&/* eslint-disable-next-line @next/next/no-img-element -- existing catalog image with a visual fallback */
      <img src={meal.image} alt={meal.name} loading="lazy" onError={event=>{event.currentTarget.hidden=true;}}/>}</div>
     <div className="nw-meal-copy"><span className="nw-slot">{meal.slotLabel}</span><h4>{meal.name.replaceAll('_',' ')}</h4><div className="nw-nutrition"><span>{meal.nutrition?.calories==null?'열량 미확인':`약 ${Math.round(meal.nutrition.calories)} kcal`}</span>{meal.nutrition?.protein!=null&&<span>단백질 {Math.round(meal.nutrition.protein*10)/10}g</span>}</div></div></div>
     {meal.product&&<NextWeekMealDetails product={meal.product}/>}
    </article>)}
   </section>;})}
    <p className="nw-note">내 기록과 기존 식단 조건을 참고했어요.<br/>표시 영양은 1인분 기준 추정치가 포함돼요.</p>
   </div>
   <footer className="nw-footer">{error&&<p role="alert">{error}</p>}{saved?<><p role="status">다음 주 식탁 준비 끝! 식단을 저장했어요.</p><Link href="/calendar/week" onClick={onClose}>저장한 주간 식단 보기 →</Link></>:<><small>저장하면 홈의 선택 식단이 다음 주 식단으로 바뀌어요.</small><button type="button" disabled={saving} onClick={onSave}>{saving?'식단 저장 중…':'이 식단으로 다음 주 준비하기'}</button></>}</footer>
  </div>
 </dialog>,document.body);
}

function NextWeekMealDetails({product}:{product:PlanProduct}){
 const [expanded,setExpanded]=useState(false);
 return <details className="nw-meal-details" onToggle={event=>setExpanded(event.currentTarget.open)}>
  <summary><span>{product.recipe?'사진 · 재료 · 만드는 법':'사진 · 상품 · 영양정보'}</span><b>{expanded?'접기':'펼치기'} <span aria-hidden="true">{expanded?'⌃':'⌄'}</span></b></summary>
  {expanded&&<div className="nw-meal-detail-content">
   {product.recipe?.sides?.length?<MealCompositionPhotos product={product}/>:<MealPhotoGallery product={product}/>}
   {product.recipe?<><details open><summary>재료</summary><RecipeProductPreview product={product} videos={false}/></details><details><summary>만드는 법</summary>{product.recipe.steps.length?<ol>{product.recipe.steps.map((step,i)=><li key={i}>{step}</li>)}</ol>:<p>등록된 조리 순서가 없어요.</p>}{product.recipe.sides?.map((side,i)=><div key={`${side.name}-${i}`}><h5>{side.name}</h5><ol>{side.steps.map((step,j)=><li key={j}>{step}</li>)}</ol></div>)}</details></>:product.productUrl&&<a href={product.productUrl} target="_blank" rel="noopener noreferrer">판매 상품 보기 ↗</a>}
   <details><summary>영양정보</summary><ProductNutrition product={product}/></details>
  </div>}
 </details>;
}
