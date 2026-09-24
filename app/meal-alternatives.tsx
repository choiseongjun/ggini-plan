'use client';
import {useEffect,useState} from 'react';
import {ProductThumb} from './product-thumb';
import {MealSourceBadge,RecipeProductPreview} from './meal-source';
import {usePlannerLocale} from './planner-locale';
import {basketTotal,type PlanProduct,type PlanConditions} from '../lib/shopping-plan';
import {usePlanEngine} from './plan-engine';
import './meal-alternatives.css';

export function MealAlternatives({index,ids,products,conditions,onChoose,disabled}:{index:number;ids:string[];products:PlanProduct[];conditions:PlanConditions;onChoose:(index:number,id:string)=>void;disabled:boolean}){
 const locale=usePlannerLocale();
 const won=locale.money;
 const [openId,setOpenId]=useState<string|null>(null);
 const engine=usePlanEngine();
 // 후보는 엔진(서버)에서 받아 온다 — 화면은 전체 메뉴 목록을 들고 있지 않다.
 const requestKey=JSON.stringify([index,ids,conditions]);
 const [loaded,setLoaded]=useState<{key:string;list:PlanProduct[]}|null>(null);
 const [loadError,setLoadError]=useState('');
 useEffect(()=>{
  let alive=true;
  engine.alternatives(ids,index,conditions).then(list=>{if(alive){setLoaded({key:requestKey,list});setLoadError('');}}).catch(e=>{if(alive)setLoadError(e instanceof Error?e.message:'후보를 불러오지 못했어요.');});
  return()=>{alive=false;};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[requestKey,engine]);
 const alternatives=loaded?.key===requestKey?loaded.list:null;
 if(loadError)return <p className="meal-alternatives-empty" role="alert">{loadError}</p>;
 if(!alternatives)return <p className="meal-alternatives-empty" aria-busy="true">후보 메뉴를 불러오고 있어요…</p>;
 const known=[...products,...alternatives];
 const current=basketTotal(ids.filter(Boolean),known,conditions.owned,conditions.supply,conditions.people);
 if(!alternatives.length)return <p className="meal-alternatives-empty">🥲 이 끼니에 바꿀 만한 다른 후보가 없어요. 조리 방식·제외 재료 설정을 확인해 주세요.</p>;
 return <div className="meal-alternatives">
  <p className="meal-alternatives-lead">🍽️ 입맛에 맞는 메뉴를 골라보세요</p>
  <div className="meal-alternatives-list" aria-label="이 끼니의 다른 메뉴 후보">
   {alternatives.map((p,i)=>{
    const next=ids.map((id,idx)=>idx===index?p.id:id);
    const total=basketTotal(next.filter(Boolean),known,conditions.owned,conditions.supply,conditions.people);
    const open=openId===p.id;
    const cheaper=total<current,pricier=total>current;
    return <article key={p.id} className="meal-alternative-card">
     {i===0&&<span className="meal-alternative-best">🌟 가장 잘 맞아요</span>}
     <div className="meal-alternative-head"><ProductThumb item={p} zoomable/><div><MealSourceBadge product={p}/><strong>{p.name}</strong><span>한 끼 {p.recipe?'재료비 ':''}약 {won(p.price/p.servings)}</span></div></div>
     <p className={`meal-alternative-diff${cheaper?' is-cheaper':pricier?' is-pricier':''}`}>{total===current?'💬 전체 구매 금액이 같아요':cheaper?`💚 전체 구매에서 ${won(current-total)} 줄어요`:`🧡 전체 구매에 ${won(total-current)} 더 필요해요`}</p>
     <div className="meal-alternative-actions">
      {p.recipe?<button type="button" aria-expanded={open} onClick={()=>setOpenId(open?null:p.id)}>{open?'레시피·영상 접기':'🎬 레시피·영상 보기'}</button>
       :p.productUrl&&<a href={p.productUrl} target="_blank" rel="noopener noreferrer">상품 보기 ↗</a>}
      <button type="button" className="primary-button" disabled={disabled||total>conditions.budget} onClick={()=>onChoose(index,p.id)}>{total>conditions.budget?`예산보다 ${won(total-conditions.budget)} 많아요`:'이 메뉴로 바꾸기'}</button>
     </div>
     {open&&p.recipe&&<RecipeProductPreview product={p}/>}
    </article>;
   })}
  </div>
 </div>;
}
