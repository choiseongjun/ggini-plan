'use client';

import {useEffect,useState} from 'react';
import {servingNutrients} from '../lib/serving-nutrients';
import {intakeExtras,isReferenceExtra,type IntakeExtra,type LoggedExtra} from '../lib/intake-extras';
import {validPortions} from '../lib/food-intake';
import type {FoodReference} from '../lib/food-reference';
import type {PlanProduct} from '../lib/shopping-plan';
import './eat-log-panel.css';
import {manualFoodReference} from '../lib/basic-food-reference';

const portionsList=[[0.5,'반'],[0.75,'3/4'],[1,'1인분'],[1.5,'1.5'],[2,'2인분']] as const;
const n=(v:number)=>Math.round(v).toLocaleString('ko-KR');

// "먹었어요" → how much of the recommended dish, plus anything eaten alongside it.
// Pantry deduction is offered only when the ingredients are registered as owned.
// initial: 사진 기록을 고칠 때 AI가 판단한 양·함께 먹은 것을 미리 채운다.
export function EatLogPanel({product,stockAvailable,disabled,onSubmit,onClose,initial,title='얼마나 먹었어요?',submitLabel='기록하기'}:{product:PlanProduct;stockAvailable:number;disabled:boolean;onSubmit:(entry:{portions:number;extras:LoggedExtra[];deduct:boolean})=>void;onClose:()=>void;initial?:{portions:number;extras:IntakeExtra[]};title?:string;submitLabel?:string}){
 const [portions,setPortions]=useState(initial?.portions??1);
 const [extras,setExtras]=useState<LoggedExtra[]>(initial?.extras??[]);
 const [foods,setFoods]=useState<Record<string,FoodReference>>({});
 const [query,setQuery]=useState('');
 const [search,setSearch]=useState<{q:string;items:FoodReference[];error?:string}|null>(null);
 const q=query.trim();
 useEffect(()=>{
  if(!q)return;
  const controller=new AbortController();
  const timer=setTimeout(()=>{
   fetch(`/api/food-reference?q=${encodeURIComponent(q)}`,{signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);return data;})
    .then(data=>{if(!controller.signal.aborted)setSearch({q,items:data.items??[]});})
    .catch(()=>{if(!controller.signal.aborted)setSearch({q,items:[],error:'음식을 찾지 못했어요. 잠시 후 다시 검색해 주세요.'});});
  },250);
  return()=>{clearTimeout(timer);controller.abort();};
 },[q]);
 const canDeduct=stockAvailable>=portions;
 const [deduct,setDeduct]=useState(stockAvailable>0);
 const base=servingNutrients(product);
 const extraKcal=extras.reduce((sum,e)=>sum+(typeof e==='string'?intakeExtras[e].calories:(foods[e.referenceCode]?.kcal??0)*e.portions),0);
 const extraProtein=extras.reduce((sum,e)=>sum+(typeof e==='string'?intakeExtras[e].protein:(foods[e.referenceCode]?.protein??0)*e.portions),0);
 const missing=extras.some(e=>typeof e!=='string'&&(foods[e.referenceCode]?.kcal==null||foods[e.referenceCode]?.protein==null));
 const valid=validPortions(portions)&&extras.every(e=>typeof e==='string'||isReferenceExtra(e));
 const kcal=base.calories===null?null:base.calories*portions+extraKcal;
 function add(food:FoodReference){
  if(extras.length>=10||extras.some(e=>typeof e!=='string'&&e.referenceCode===food.code))return;
  setFoods(current=>({...current,[food.code]:food}));setExtras(current=>[...current,{referenceCode:food.code,portions:1}]);setQuery('');
 }

 return <div className="eat-log" role="group" aria-label={`${product.name} 먹은 기록`}>
  <div className="eat-log-head"><strong>{title}</strong><button type="button" aria-label="닫기" onClick={onClose}>✕</button></div>
  <div className="eat-log-portions" role="radiogroup" aria-label="먹은 양">{portionsList.map(([value,label])=><button type="button" role="radio" key={value} aria-checked={portions===value} onClick={()=>setPortions(value)}>{label}</button>)}</div>
  <label className="eat-log-custom">먹은 양 직접 입력<input type="number" min="0.25" max="10" step="0.25" value={portions||''} disabled={disabled} onChange={e=>setPortions(Number(e.target.value))}/>인분</label>
  <p className="eat-log-total" aria-live="polite">{!valid?'먹은 양을 0.25~10인분, 0.25 단위로 입력해 주세요.':<>{kcal===null?'주 메뉴 칼로리 미확인':<>약 <b>{n(kcal)}</b>kcal</>}{base.protein!==null&&<> · 단백질 {n(base.protein*portions+extraProtein)}g</>}{extras.length>0&&<small> · 추가 음식 {n(extraKcal)}kcal 포함</small>}{missing&&<small> · 영양정보가 없는 항목은 합계에서 제외했어요.</small>}</>}</p>
  <div className="eat-log-food-search">
   <label className="eat-log-label">함께 먹은 음식 추가 <span>선택</span><input type="search" aria-label="함께 먹은 음식 검색" placeholder="예: 계란후라이, 사과, 카페라떼" maxLength={40} value={query} disabled={disabled||extras.length>=10} onChange={e=>setQuery(e.target.value)}/></label>
   <p className="eat-log-search-hint">음식을 검색하고 먹은 양을 입력하세요. 메뉴에 포함된 밥은 다시 추가하지 않아도 돼요.</p>
   {q&&search?.q!==q&&<p role="status">찾고 있어요…</p>}
   {q&&search?.q===q&&(search.error?<p role="alert">{search.error}</p>:!search.items.length?<p>맞는 음식이 없으면 아래에서 이름 그대로 추가할 수 있어요.</p>:<ul className="eat-log-search-results">{search.items.map(f=><li key={f.code}><button type="button" disabled={disabled||extras.some(e=>typeof e!=='string'&&e.referenceCode===f.code)} onClick={()=>add(f)}><strong>{f.name}{f.brand&&<small>{f.brand}</small>}{f.code.startsWith('raw:')&&<small>{f.category}</small>}</strong><span>{f.servingAmount}{f.servingUnit} 기준 · {f.kcal===null?'열량 미확인':`${n(f.kcal)}kcal`}</span></button></li>)}</ul>)}
   {q&&<div className="eat-log-manual"><button type="button" disabled={disabled||extras.length>=10} onClick={()=>{const f=manualFoodReference(`manual:${q}`);if(f)add(f);}}>목록에 없나요? ‘{q}’ 그대로 추가</button><small>이름과 먹은 양을 기록해요. 영양정보는 미확인으로 남기고 합계에서 제외해요.</small></div>}
   {!!extras.length&&<ul className="eat-log-selected">{extras.map((e,index)=>{const f=typeof e==='string'?null:foods[e.referenceCode];const name=typeof e==='string'?intakeExtras[e].label:f?.name??'추가 음식';return <li key={typeof e==='string'?e:e.referenceCode}><div><strong>{name}</strong><small>{typeof e==='string'?`${intakeExtras[e].calories}kcal · 사진 분석 참고값`:<>1회 {f?.servingAmount}{f?.servingUnit} · {f?.kcal==null?'열량 미확인':`${n(f.kcal*e.portions)}kcal`}{f?.servingUnit==='g'&&` · 먹은 양 ${n(f.servingAmount*e.portions)}g`}</>}</small></div>{typeof e!=='string'&&<label><input type="number" aria-label={`${name} 먹은 양`} min="0.25" max="10" step="0.25" disabled={disabled} value={e.portions||''} onChange={event=>setExtras(current=>current.map((item,i)=>i===index?{referenceCode:e.referenceCode,portions:Number(event.target.value)}:item))}/>회</label>}<button type="button" aria-label={`${name} 추가 취소`} disabled={disabled} onClick={()=>setExtras(current=>current.filter((_,i)=>i!==index))}>삭제</button></li>;})}</ul>}
   {extras.length>=10&&<p className="eat-log-search-hint">함께 먹은 음식은 한 번에 10개까지 추가할 수 있어요.</p>}
  </div>
  {stockAvailable>0&&<label className="eat-log-deduct"><input type="checkbox" checked={deduct&&canDeduct} disabled={!canDeduct} onChange={e=>setDeduct(e.target.checked)}/>집에 있는 재료에서 차감{!canDeduct&&` (남은 양 ${stockAvailable}회분)`}</label>}
  <button type="button" className="eat-log-submit" disabled={disabled||!valid} onClick={()=>onSubmit({portions,extras,deduct:deduct&&canDeduct})}>{submitLabel}</button>
  <small className="eat-log-note">선택한 음식의 영양정보 × 먹은 양으로 계산해요. 실제 조리법에 따라 달라질 수 있어요.</small>
 </div>;
}
