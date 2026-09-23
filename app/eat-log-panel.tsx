'use client';

import {useState} from 'react';
import {servingNutrients} from '../lib/serving-nutrients';
import {intakeExtras,type IntakeExtra} from '../lib/intake-extras';
import type {PlanProduct} from '../lib/shopping-plan';
import './eat-log-panel.css';

const portionsList=[[0.5,'반'],[0.75,'3/4'],[1,'1인분'],[1.5,'1.5'],[2,'2인분']] as const;
const n=(v:number)=>Math.round(v).toLocaleString('ko-KR');

// "먹었어요" → how much of the recommended dish, plus anything eaten alongside it.
// Pantry deduction is offered only when the ingredients are registered as owned.
export function EatLogPanel({product,stockAvailable,disabled,onSubmit,onClose}:{product:PlanProduct;stockAvailable:number;disabled:boolean;onSubmit:(entry:{portions:number;extras:IntakeExtra[];deduct:boolean})=>void;onClose:()=>void}){
 const [portions,setPortions]=useState(1);
 const [extras,setExtras]=useState<IntakeExtra[]>([]);
 const canDeduct=stockAvailable>=portions;
 const [deduct,setDeduct]=useState(stockAvailable>0);
 const base=servingNutrients(product);
 const extraKcal=extras.reduce((sum,key)=>sum+intakeExtras[key].calories,0);
 const extraProtein=extras.reduce((sum,key)=>sum+intakeExtras[key].protein,0);
 const kcal=base.calories===null?null:base.calories*portions+extraKcal;
 const toggle=(key:IntakeExtra)=>setExtras(list=>list.includes(key)?list.filter(k=>k!==key):[...list,key]);

 return <div className="eat-log" role="group" aria-label={`${product.name} 먹은 기록`}>
  <div className="eat-log-head"><strong>얼마나 먹었어요?</strong><button type="button" aria-label="닫기" onClick={onClose}>✕</button></div>
  <div className="eat-log-portions" role="radiogroup" aria-label="먹은 양">{portionsList.map(([value,label])=><button type="button" role="radio" key={value} aria-checked={portions===value} onClick={()=>setPortions(value)}>{label}</button>)}</div>
  <p className="eat-log-total" aria-live="polite">{kcal===null?'칼로리 정보 없음':<>약 <b>{n(kcal)}</b>kcal</>}{base.protein!==null&&<> · 단백질 {n(base.protein*portions+extraProtein)}g</>}{extras.length>0&&<small> (함께 먹은 것 {n(extraKcal)}kcal 포함)</small>}</p>
  <span className="eat-log-label">함께 먹은 것</span>
  <div className="eat-log-extras">{(Object.keys(intakeExtras) as IntakeExtra[]).map(key=><button type="button" key={key} aria-pressed={extras.includes(key)} onClick={()=>toggle(key)}>{intakeExtras[key].label}<small>{intakeExtras[key].calories}</small></button>)}</div>
  {stockAvailable>0&&<label className="eat-log-deduct"><input type="checkbox" checked={deduct&&canDeduct} disabled={!canDeduct} onChange={e=>setDeduct(e.target.checked)}/>집에 있는 재료에서 차감{!canDeduct&&` (남은 양 ${stockAvailable}회분)`}</label>}
  <button type="button" className="eat-log-submit" disabled={disabled} onClick={()=>onSubmit({portions,extras,deduct:deduct&&canDeduct})}>기록하기</button>
  <small className="eat-log-note">함께 먹은 것은 1회 기준 참고값이에요.</small>
 </div>;
}
