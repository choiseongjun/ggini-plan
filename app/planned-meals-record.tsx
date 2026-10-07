'use client';
import {useState} from 'react';
import Link from 'next/link';
import {Button,Card,Notice} from './components/ui';
import {useHomePlan} from './use-home-plan';
import {mealSchedule,slotLabels,type MealSlot,type PlanProduct} from '../lib/shopping-plan';
import {planDate,recordedForSlot} from '../lib/daily-plan';
import {servingNutrition} from '../lib/food-intake';
import {servingNutrients} from '../lib/serving-nutrients';
import type {useFoodIntake} from './food-intake';
import './planned-meals-record.css';

type Intake=Pick<ReturnType<typeof useFoodIntake>,'current'|'send'|'disabled'|'today'>;
type Meal={index:number;slot:MealSlot;product:PlanProduct;done:boolean};
const menuName=(p:PlanProduct)=>p.name.split('_').join(' · ');
const slotIcon={breakfast:'☀️',lunch:'🌤️',dinner:'🌙'} as const;

/** 기록 탭: 오늘 추천받은 끼니를 사진·검색 없이 그대로 식사 일기에 남긴다. */
export function PlannedMealsRecord({userId,intake}:{userId?:string;intake:Intake}){
 const {plan}=useHomePlan(userId);
 const [saving,setSaving]=useState(false),[saved,setSaved]=useState('');
 const {current,send,disabled,today}=intake;
 if(!plan||!current)return null;
 const schedule=mealSchedule(plan.conditions),start=plan.conditions.startDate??today;
 const planned=plan.ids.flatMap((id,index)=>{const s=schedule[index],product=plan.products.find(p=>p.id===id);return s&&product&&planDate(start,s.day)===today?[{index,slot:s.slot,product}]:[];});
 if(!planned.length)return null;
 const meals:Meal[]=planned.map((m,i)=>{const portions=current.logs.filter(l=>l.productId===m.product.id).reduce((sum,l)=>sum+l.portions,0);return {...m,done:recordedForSlot(planned.map(e=>e.product.id),i,portions)>0};});
 const left=meals.filter(m=>!m.done);
 const busy=saving||disabled;
 // 홈의 '먹었어요'와 같은 기록: 회원은 식사 일기, 비회원은 이 기기에 남고 로그인하면 옮겨진다.
 const logMeal=(m:Meal)=>{const n=servingNutrition(m.product),x=servingNutrients(m.product);return send({action:'log',id:crypto.randomUUID(),version:current.version,productId:m.product.id,portions:1,extras:[],mealSlot:m.slot,guest:{name:menuName(m.product),calories:n.calories,protein:n.protein,carbs:x.carbs,fat:x.fat,sugar:null,sodium:x.sodium}});};
 async function record(targets:Meal[]){
  setSaving(true);setSaved('');
  const done:string[]=[];
  try{for(const m of targets){if(!await logMeal(m))break;done.push(slotLabels[m.slot]);}}
  finally{setSaving(false);}
  if(done.length)setSaved(`${done.join('·')}을 식사 일기에 남겼어요.${done.length<targets.length?' 나머지는 다시 눌러 주세요.':''}`);
 }
 return <Card className="planned-meals-record" aria-labelledby="planned-meals-title">
  <div className="planned-meals-head"><h3 id="planned-meals-title">오늘 추천 식단</h3><span>{meals.length-left.length}/{meals.length}끼 기록</span></div>
  <p className="planned-meals-intro">{left.length?'추천대로 먹었다면 한 번에 남겨요. 다르게 먹은 끼니만 위에서 사진이나 검색으로 기록해 주세요.':'오늘 추천 식단을 모두 기록했어요.'}</p>
  <ul className="planned-meals-list">{meals.map(m=><li key={m.index} className={m.done?'is-done':undefined}>
   <span className="planned-meals-slot">{slotIcon[m.slot]} {slotLabels[m.slot]}</span>
   <strong>{menuName(m.product)}</strong>
   {m.done?<span className="planned-meals-status">기록 완료</span>:<Button size="sm" variant="secondary" disabled={busy} onClick={()=>void record([m])}>먹었어요</Button>}
  </li>)}</ul>
  {left.length>1&&<Button block disabled={busy} onClick={()=>void record(left)}>{saving?'기록하고 있어요…':`남은 ${left.length}끼 모두 먹었어요`}</Button>}
  {saved&&<Notice tone="success">{saved}</Notice>}
  {!userId&&<p className="planned-meals-note">로그인 없이 이 기기에 먼저 남겨요. 로그인하면 계정 식사 일기로 옮겨요.</p>}
  <Link className="planned-meals-link" href="/">오늘 식단 자세히 보기</Link>
 </Card>;
}
