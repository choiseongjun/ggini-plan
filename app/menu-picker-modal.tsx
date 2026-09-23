'use client';

import {useDeferredValue,useEffect,useId,useMemo,useRef,useState} from 'react';
import {servingNutrients} from '../lib/serving-nutrients';
import {alternativesFor,basketTotal,cookingDishId,dishBase,dishWords,mealSchedule,repeatsDailyMain,slotCandidates,slotLabels,type PlanConditions,type PlanProduct} from '../lib/shopping-plan';
import {ProductThumb} from './product-thumb';
import {MealSourceBadge} from './meal-source';
import {usePlannerLocale} from './planner-locale';
import './menu-picker-modal.css';

type Sort='fit'|'price'|'kcal'|'protein';
const PAGE=24;
// What people browse by, not the recipe engine's templates: 볶음밥 is 밥 (not a 볶음 반찬) and
// 짜장면 is 면, so rice/noodle dishes are recognised by name first, then by template.
const categories=[
 {key:'bap',label:'밥·덮밥'},
 {key:'myeon',label:'면'},
 {key:'guk',label:'국·탕'},
 {key:'jjigae',label:'찌개·전골'},
 {key:'bokkeum',label:'볶음'},
 {key:'gui',label:'구이'},
 {key:'jjim',label:'찜'},
 {key:'jorim',label:'조림'},
 {key:'jeon',label:'전·부침'},
 {key:'twigim',label:'튀김'},
 {key:'juk',label:'죽·스프'},
 {key:'etc',label:'기타'},
 {key:'ready',label:'간편식'},
] as const;
type Category='all'|(typeof categories)[number]['key'];
const byTemplate:Record<string,Category>={guktang:'guk',jjigae:'jjigae','stirfry-meat-rice':'bokkeum',jjajang:'bokkeum',gui:'gui',jjim:'jjim',jorim:'jorim',jeon:'jeon',twigim:'twigim',myeon:'myeon','bap-etc':'bap',juk:'juk'};
const noodleName=/국수|라면|라멘|칼국수|냉면|막국수|우동|짜장면|짬뽕|쌀국수|파스타|스파게티|수제비|기스면|잔치국수/;
const riceName=/밥|김밥|덮밥|리소토|리조또|오므라이스|주먹밥/;
function categoryOf(p:PlanProduct):Category{
 if(!p.recipe)return 'ready';
 const name=p.name.split('_')[0];
 if(/맛탕/.test(name))return 'etc';
 if(/볶음탕|찜닭|닭찜/.test(name))return 'jjim';
 if(noodleName.test(name))return 'myeon';
 if(riceName.test(name)&&!/국밥|밥솥|밥도둑/.test(name))return 'bap';
 return byTemplate[p.recipe.family.replace(/^govdb-/,'')]??'etc';
}
const normalize=(text:string)=>text.toLowerCase().replace(/[\s\[\]()·,._-]/g,'');

export function MenuPickerModal({index,ids,products,conditions,onChoose,onClose,disabled}:{index:number|null;ids:string[];products:PlanProduct[];conditions:PlanConditions;onChoose:(index:number,id:string)=>void;onClose:()=>void;disabled:boolean}){
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

 // Same rules the planner applies when a meal is chosen, so everything listed can actually be picked.
 const c=useMemo(()=>({...conditions,mealMode:'mixed' as const,cooking:'all' as const}),[conditions]);
 const all=useMemo(()=>{
  if(index===null)return [];
  const best=new Map<string,PlanProduct>();
  for(const p of slotCandidates(products,c,index)){
   if(p.recipe&&p.id.includes('--with--'))continue;
   const key=cookingDishId(p.id),prev=best.get(key);
   if(!prev||(p.personalizationScore??0)>(prev.personalizationScore??0))best.set(key,p);
  }
  return [...best.values()].map(p=>({p,n:servingNutrients(p),perMeal:p.price/p.servings,category:categoryOf(p),search:normalize(`${p.name} ${p.recipe?.ingredients.map(i=>i.product.name).join(' ')??''}`)}));
 },[products,c,index]);
 const recommended=useMemo(()=>index===null?new Set<string>():new Set(alternativesFor(products,ids,conditions,index,3).map(p=>cookingDishId(p.id))),[products,ids,conditions,index]);

 if(index===null)return <dialog ref={dialog} className="menu-picker"/>;
 const slot=mealSchedule(conditions)[index];
 const currentId=ids[index];
 const needle=normalize(deferred);
 const matching=needle?all.filter(x=>x.search.includes(needle)):all;
 const counts=new Map<Category,number>();
 for(const x of matching)counts.set(x.category,(counts.get(x.category)??0)+1);
 const chips:{key:Category;label:string}[]=[{key:'all',label:'전체'},...categories];
 const list=matching
  .filter(x=>category==='all'||x.category===category)
  .sort((a,b)=>sort==='price'?a.perMeal-b.perMeal:sort==='kcal'?(a.n.calories??1e9)-(b.n.calories??1e9):sort==='protein'?(b.n.protein??-1)-(a.n.protein??-1)
   :Number(recommended.has(cookingDishId(b.p.id)))-Number(recommended.has(cookingDishId(a.p.id)))||(b.p.personalizationScore??0)-(a.p.personalizationScore??0));
 const current=basketTotal(ids,products,conditions.owned,conditions.supply,conditions.people);
 const blockReason=(p:PlanProduct)=>cookingDishId(p.id)===cookingDishId(currentId??'')?'지금 메뉴':ids.some((id,i)=>i!==index&&cookingDishId(id)===cookingDishId(p.id))?'다른 끼니에 있어요':ids.some((id,i)=>{if(i===index)return false;const q=products.find(x=>x.id===id);return q?dishBase(q)===dishBase(p)||dishWords(q)===dishWords(p):false;})?'같은 음식이 이미 있어요':repeatsDailyMain(ids,products,c,index,p)?'같은 날 주재료 겹침':null;
 const pickedItem=picked?all.find(x=>x.p.id===picked):null;
 const pickedTotal=pickedItem?basketTotal(ids.map((id,i)=>i===index?pickedItem.p.id:id),products,conditions.owned,conditions.supply,conditions.people):null;
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
    {!list.length&&<div className="mp-empty"><strong>찾는 메뉴가 없어요</strong><p>다른 이름이나 재료로 검색해 보세요. 제외 재료·음식 종류 설정에 걸린 메뉴는 보이지 않아요.</p></div>}
    <ul className="mp-list">{list.slice(0,shown).map(({p,n,perMeal},i)=>{
     const blocked=blockReason(p);
     const isPicked=picked===p.id;
     return <li key={p.id} style={{'--i':Math.min(i,12)} as React.CSSProperties}>
      <button type="button" className={`mp-item${isPicked?' is-picked':''}`} disabled={Boolean(blocked)} aria-pressed={isPicked} onClick={()=>setPicked(isPicked?null:p.id)}>
       <ProductThumb item={p}/>
       <span className="mp-item-body">
        <span className="mp-item-tags">{recommended.has(cookingDishId(p.id))&&<em className="mp-best">추천</em>}<MealSourceBadge product={p}/>{blocked&&<em className="mp-blocked">{blocked}</em>}</span>
        <strong>{p.name}</strong>
        <span className="mp-item-meta"><b>{won(perMeal)}</b>{n.calories!==null&&<span>한 끼 {Math.round(n.calories)}kcal</span>}{n.protein!==null&&<span>단백질 {Math.round(n.protein)}g</span>}</span>
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
