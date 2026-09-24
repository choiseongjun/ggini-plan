'use client';

import {useDeferredValue,useEffect,useId,useRef,useState} from 'react';
import {mealSchedule,slotLabels,type PlanConditions,type PlanProduct} from '../lib/shopping-plan';
import {categories,type Category} from '../lib/menu-category';
import {normalizeSearch,type PickerItem} from '../lib/plan-picker';
import {usePlanEngine} from './plan-engine';
import {ProductThumb} from './product-thumb';
import {MealSourceBadge} from './meal-source';
import {usePlannerLocale} from './planner-locale';
import './menu-picker-modal.css';

type Sort='fit'|'price'|'kcal'|'protein';
const PAGE=24;

export function MenuPickerModal({index,ids,conditions,onChoose,onClose,disabled}:{index:number|null;ids:string[];products?:PlanProduct[];conditions:PlanConditions;onChoose:(index:number,id:string)=>void;onClose:()=>void;disabled:boolean}){
 const locale=usePlannerLocale();
 const won=locale.money;
 const dialog=useRef<HTMLDialogElement>(null);
 const titleId=useId();
 const open=index!==null;
 const [query,setQuery]=useState('');
 const deferred=useDeferredValue(query);
 const [category,setCategory]=useState<Category>('all');
 const [sort,setSort]=useState<Sort>('fit');
 const [shown,setShown]=useState(PAGE);
 const [picked,setPicked]=useState<string|null>(null);
 useEffect(()=>{
  const node=dialog.current;
  if(!open||!node)return;
  const previous=document.body.style.overflow;
  node.showModal();document.body.style.overflow='hidden';
  return()=>{node.close();document.body.style.overflow=previous;};
 },[open]);

 // 후보 목록(영양·금액·고를 수 없는 이유 포함)은 엔진이 계산한다 — 화면은 전체 메뉴를 들고 있지 않다.
 const engine=usePlanEngine();
 const [data,setData]=useState<{key:string;items:PickerItem[];current:number}|null>(null);
 const [loadError,setLoadError]=useState('');
 const requestKey=index===null?'':JSON.stringify([index,ids,conditions]);
 useEffect(()=>{
  if(index===null)return;
  let alive=true;
  engine.picker(ids,index,conditions).then(d=>{if(alive){setData({key:requestKey,...d});setLoadError('');}}).catch(e=>{if(alive)setLoadError(e instanceof Error?e.message:'메뉴 목록을 불러오지 못했어요.');});
  return()=>{alive=false;};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[requestKey,engine]);
 const all=data?.key===requestKey?data.items:null;

 if(index===null)return <dialog ref={dialog} className="menu-picker"/>;
 const slot=mealSchedule(conditions)[index];
 const needle=normalizeSearch(deferred);
 const matching=!all?[]:needle?all.filter(x=>x.search.includes(needle)):all;
 const counts=new Map<Category,number>();
 for(const x of matching)counts.set(x.category,(counts.get(x.category)??0)+1);
 const chips:{key:Category;label:string}[]=[{key:'all',label:'전체'},...categories];
 const list=matching
  .filter(x=>category==='all'||x.category===category)
  .sort((a,b)=>sort==='price'?a.perMeal-b.perMeal:sort==='kcal'?(a.calories??1e9)-(b.calories??1e9):sort==='protein'?(b.protein??-1)-(a.protein??-1)
   :Number(b.recommended)-Number(a.recommended)||(b.p.personalizationScore??0)-(a.p.personalizationScore??0));
 const current=data?.current??0;
 const pickedItem=picked&&all?all.find(x=>x.p.id===picked)??null:null;
 const pickedTotal=pickedItem?pickedItem.total:null;
 const overBudget=pickedTotal!==null&&pickedTotal>conditions.budget;
 const close=()=>{setPicked(null);setQuery('');setCategory('all');setShown(PAGE);onClose();};

 return <dialog ref={dialog} className="menu-picker" aria-labelledby={titleId} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}}>
  <div className="mp-sheet">
   <header className="mp-head">
    <div className="mp-head-row"><div><span className="mp-kicker">{slot?`${slot.day}일차 · ${slotLabels[slot.slot]}`:'메뉴 고르기'}</span><h2 id={titleId}>먹고 싶은 메뉴를 골라요</h2></div><button type="button" className="mp-close" aria-label="닫기" onClick={close}>✕</button></div>
    <label className="mp-search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input type="search" value={query} placeholder="메뉴·재료 검색 (예: 닭가슴살, 김치)" aria-label="메뉴 검색" onChange={e=>{setQuery(e.target.value);setShown(PAGE);}}/>{query&&<button type="button" aria-label="검색어 지우기" onClick={()=>setQuery('')}>✕</button>}</label>
    <div className="mp-cats-wrap"><div className="mp-cats" role="tablist" aria-label="메뉴 종류">{chips.filter(c=>c.key==='all'||counts.get(c.key)||category===c.key).map(c=><button type="button" role="tab" key={c.key} aria-selected={category===c.key} onClick={e=>{setCategory(c.key);setShown(PAGE);e.currentTarget.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});}}>{c.label}<small>{c.key==='all'?matching.length:counts.get(c.key)??0}</small></button>)}</div></div>
   </header>
   <div className="mp-scroll">
    <div className="mp-count-row"><p className="mp-count" aria-live="polite">{deferred?`‘${deferred}’ 검색 결과 `:''}{list.length}개 메뉴</p><select value={sort} aria-label="정렬" onChange={e=>setSort(e.target.value as Sort)}><option value="fit">나에게 맞는 순</option><option value="price">가격 낮은 순</option><option value="kcal">칼로리 낮은 순</option><option value="protein">단백질 높은 순</option></select></div>
    {!all&&!loadError&&<div className="mp-empty" aria-busy="true"><strong>메뉴를 불러오고 있어요</strong></div>}
    {loadError&&<div className="mp-empty" role="alert"><strong>{loadError}</strong></div>}
    {all&&!list.length&&<div className="mp-empty"><strong>찾는 메뉴가 없어요</strong><p>다른 이름이나 재료로 검색해 보세요. 제외 재료·음식 종류 설정에 걸린 메뉴는 보이지 않아요.</p></div>}
    <ul className="mp-list">{list.slice(0,shown).map(({p,calories,protein,perMeal,blocked,recommended},i)=>{
     const isPicked=picked===p.id;
     return <li key={p.id} style={{'--i':Math.min(i,12)} as React.CSSProperties}>
      <button type="button" className={`mp-item${isPicked?' is-picked':''}`} disabled={Boolean(blocked)} aria-pressed={isPicked} onClick={()=>setPicked(isPicked?null:p.id)}>
       <ProductThumb item={p}/>
       <span className="mp-item-body">
        <span className="mp-item-tags">{recommended&&<em className="mp-best">추천</em>}<MealSourceBadge product={p}/>{blocked&&<em className="mp-blocked">{blocked}</em>}</span>
        <strong>{p.name}</strong>
        <span className="mp-item-meta"><b>{won(perMeal)}</b>{calories!==null&&<span>한 끼 {Math.round(calories)}kcal</span>}{protein!==null&&<span>단백질 {Math.round(protein)}g</span>}</span>
       </span>
       <span className="mp-check" aria-hidden="true"/>
      </button>
     </li>;
    })}</ul>
    {list.length>shown&&<button type="button" className="mp-more" onClick={()=>setShown(s=>s+PAGE)}>더 보기 ({list.length-shown}개 남음)</button>}
   </div>
   <footer className={`mp-foot${pickedItem?' is-ready':''}`}>
    {pickedItem?<p>{pickedItem.p.name}<span>{pickedTotal===current?'전체 장보기 금액 그대로':pickedTotal!<current?`장보기 ${won(current-pickedTotal!)} 절약`:`장보기 ${won(pickedTotal!-current)} 추가`}</span></p>:<p className="mp-hint">메뉴를 눌러 선택해 주세요</p>}
    <button type="button" disabled={!pickedItem||disabled||overBudget} onClick={()=>{if(pickedItem){onChoose(index,pickedItem.p.id);close();}}}>{overBudget?`예산보다 ${won(pickedTotal!-conditions.budget)} 많아요`:'이 메뉴로 바꾸기'}</button>
   </footer>
  </div>
 </dialog>;
}
