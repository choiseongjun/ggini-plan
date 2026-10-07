'use client';
import {shoppingBudgetLimit} from '../lib/shopping-plan';

import {useEffect,useState} from 'react';
import {MealPhotoGallery} from './meal-photo-gallery';
import {Button} from './components/ui';
import {RecipeProductPreview} from './meal-source';
import {usePlannerLocale} from './planner-locale';
import {basketTotal,type PlanProduct,type PlanConditions} from '../lib/shopping-plan';
import {usePlanEngine} from './plan-engine';
import {mealSimilarity} from '../lib/meal-similarity';
import './meal-alternatives.css';

export function MealAlternatives({index,ids,products,conditions,onChoose,disabled,limit=6}:{index:number;ids:string[];products:PlanProduct[];conditions:PlanConditions;onChoose:(index:number,id:string)=>void;disabled:boolean;limit?:number}){
 const locale=usePlannerLocale();
 const won=locale.money;
 const [openId,setOpenId]=useState<string|null>(null);
 const engine=usePlanEngine();
 // 후보는 엔진(서버)에서 받아 온다 — 화면은 전체 메뉴 목록을 들고 있지 않다.
 const requestKey=JSON.stringify([index,ids,conditions,limit]);
 const [loaded,setLoaded]=useState<{key:string;list:PlanProduct[]}|null>(null);
 const [loadError,setLoadError]=useState<{key:string;message:string}|null>(null);
 useEffect(()=>{
  let alive=true;
  engine.alternatives(ids,index,conditions,limit).then(list=>{if(alive){setLoaded({key:requestKey,list});setLoadError(null);}}).catch(e=>{if(alive)setLoadError({key:requestKey,message:e instanceof Error?e.message:'후보를 불러오지 못했어요.'});});
  return()=>{alive=false;};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[requestKey,engine]);
 const alternatives=loaded?.key===requestKey?loaded.list:null;
 if(loadError?.key===requestKey)return <p className="meal-alternatives-empty" role="alert">{loadError.message}</p>;
 if(!alternatives)return <p className="meal-alternatives-empty" aria-busy="true">후보 메뉴를 불러오고 있어요…</p>;
 const known=[...products,...alternatives];
 const current=basketTotal(ids.filter(Boolean),known,conditions.owned,conditions.supply,conditions.people);
 const original=products.find(p=>p.id===ids[index]);
 if(!alternatives.length)return <p className="meal-alternatives-empty">현재 조건에서 재료나 음식 종류가 비슷한 메뉴를 찾지 못했어요. 아래 ‘메뉴 직접 검색하기’에서 다른 음식을 골라보세요.</p>;
 return <div className="meal-alternatives">
  <p className="meal-alternatives-lead">{original?'비슷한 메뉴를 골라 이 끼니만 바꿔요':'입맛에 맞는 메뉴를 골라보세요'}</p>
  <div className="meal-alternatives-list" aria-label="이 끼니의 다른 메뉴 후보">
   {alternatives.map(p=>{
    const next=ids.map((id,idx)=>idx===index?p.id:id);
    const total=basketTotal(next.filter(Boolean),known,conditions.owned,conditions.supply,conditions.people);
    const open=openId===p.id;
    const cheaper=total<current,pricier=total>current;
    const name=p.name.replace(/_/g,' · ');
    return <article key={p.id} className="meal-alternative-card">
     <div className="meal-alternative-head"><div><strong>{name}</strong><span>1인분 {p.recipe?'재료비 ':''}약 {won(p.price/p.servings)}</span></div></div>
     <p className={`meal-alternative-diff${cheaper?' is-cheaper':pricier?' is-pricier':''}`}>{total===current?'장보기 금액 동일':`장보기 ${cheaper?'−':'+'}${won(Math.abs(total-current))}`}</p>
     <div className="meal-alternative-actions">
      <Button variant="secondary" size="sm" aria-expanded={open} aria-label={`${name} 상세 ${open?'접기':'보기'}`} onClick={()=>setOpenId(open?null:p.id)}>{open?'상세 접기':'사진·상세 보기'}</Button>
      <Button size="sm" disabled={disabled||total>shoppingBudgetLimit(conditions)} onClick={()=>onChoose(index,p.id)}>{total>shoppingBudgetLimit(conditions)?'예산 초과':'이 메뉴로 변경'}</Button>
     </div>
     {open&&<div className="meal-alternative-detail">
      <MealPhotoGallery product={p}/>
      {original&&<p className="meal-alternative-detail-note">{mealSimilarity(original,p).reasons.join(' · ')}</p>}
      <p className="meal-alternative-detail-note">장보기 차액은 이 메뉴로 바꿨을 때 전체 식단의 추가 구매 예상금액 차이예요.</p>
      {p.recipe?<details><summary>재료·레시피·영상 보기</summary><RecipeProductPreview product={p}/></details>:p.productUrl&&<a href={p.productUrl} target="_blank" rel="noopener noreferrer">상품 상세 보기</a>}
     </div>}

    </article>;
   })}
  </div>
 </div>;
}
