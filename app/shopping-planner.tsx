'use client';

import {MealComparison,RecipePurchaseNote} from './meal-comparison';
import {useFoodIntake} from './food-intake';
import {remainingPlanPortions,planDate} from '../lib/daily-plan';
import {TodayMeals} from './today-meals';
import {SharePlanButton} from './share-plan-button';
import {emptyDashboard,type DashboardData} from '../lib/dashboard';
import { Checkbox } from "./components/checkbox";
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type {personalizeProducts} from '../lib/shopping-personalization';
import { ProductThumb } from './product-thumb';
import {MealSourceBadge,RecipeProductPreview} from './meal-source';
import { basket, purchaseBasket, basketTotal, validMealIds, slotCandidates, mealSchedule, slotLabels, initialConditions, parseConditions, recommendShopping, swapMeal, type MealSlot, type PlanConditions, type PlanProduct } from '../lib/shopping-plan';
import './shopping-planner.css';
import {shoppingBudgetGuide} from '../lib/shopping-budget';
import {excludedFoods,excludedFoodGroups,type ExcludedFood} from '../lib/excluded-foods';
import {resolveShoppingExclusions} from '../lib/shopping-exclusions';
import {ShoppingProgress,useShoppingProgress} from './shopping-progress';

function useBudgetGuide(products:PlanProduct[],key:string){return useMemo(()=>shoppingBudgetGuide(products,JSON.parse(key)),[products,key]);}
const won=(n:number)=>`${n.toLocaleString('ko-KR')}원`;
function ingredientAmount(p:PlanProduct,packs:number){
 const count=p.unit==='개'&&p.quantity>1;
 const unit=count?'개':p.servingGrams?'g':'묶음';
 return `${Number((packs*(count?p.quantity:p.servingGrams??1)).toFixed(1))}${unit}`;
}
function encodeDraft(conditions:PlanConditions,mealIds:string[]){return JSON.stringify({conditions,mealIds,savedAt:Date.now()});}
export function ShoppingPlanner({userId,onLogin,mode='plan',dashboard}:{userId?:string;onLogin:()=>void;mode?:'plan'|'cart'|'settings';dashboard?:DashboardData|null}){
 const draftKey=`kkiniplan-shopping-draft-v2-${userId??'guest'}`;
 const setupRef=useRef<HTMLDetailsElement>(null);
 const [personalization,setPersonalization]=useState<ReturnType<typeof personalizeProducts>['personalization']|null>(null);
 const [profileExcluded,setProfileExcluded]=useState<ExcludedFood[]>([]);
 const progress=useShoppingProgress(userId,'products');
 const intake=useFoodIntake(mode==='settings'?undefined:userId);
 const [products,setProducts]=useState<PlanProduct[]>([]),[baseConditions,setConditions]=useState<PlanConditions>(initialConditions);
 const conditions:PlanConditions={...baseConditions,supply:Object.fromEntries(Object.values(progress.stock).map(i=>[i.id,i.owned+i.ordered]))};
 const [ids,setIds]=useState<string[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const guideKey=JSON.stringify({...conditions,budget:1000000,startDate:undefined});
 const budgetGuide=useBudgetGuide(products,guideKey);
 const [allowSingleMenu,setAllowSingleMenu]=useState(false);
 const [showExclusions,setShowExclusions]=useState(false);
 const [confirmReset,setConfirmReset]=useState(false);
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/shopping-plan',{cache:'no-store',signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);return d;}).then(d=>{
   const catalog=d.baseProducts??d.products,defaults=d.excluded??[];
   setProducts(catalog);setProfileExcluded(defaults);setPersonalization(d.personalization);setError('');setIds([]);
   const saved=parseConditions(d.preferences);setConditions(resolveShoppingExclusions(saved??initialConditions,defaults));
   try{
    const guestKey='kkiniplan-shopping-draft-v2-guest';
    if(d.resetAt)for(const storage of [localStorage,sessionStorage])for(const key of [draftKey,guestKey]){
     const raw=storage.getItem(key);
     if(raw&&Number(JSON.parse(raw)?.savedAt??0)<=Date.parse(d.resetAt))storage.removeItem(key);
    }
    if(draftKey!==guestKey&&!localStorage.getItem(draftKey)&&!sessionStorage.getItem(draftKey)){
     const guest=localStorage.getItem(guestKey)??sessionStorage.getItem(guestKey);
     if(guest&&parseConditions(JSON.parse(guest)?.conditions)){localStorage.setItem(draftKey,guest);localStorage.removeItem(guestKey);sessionStorage.removeItem(guestKey);}
    }
    const draft=JSON.parse(localStorage.getItem(draftKey)??sessionStorage.getItem(draftKey)??'null')??d.plan;const c=parseConditions(draft?.conditions);
    if(c){const resolved=resolveShoppingExclusions(c,defaults);resolved.startDate??=emptyDashboard().today;setConditions(resolved);if(Array.isArray(draft.mealIds)&&validMealIds(draft.mealIds,catalog,resolved)){setIds(draft.mealIds);localStorage.setItem(draftKey,JSON.stringify({conditions:resolved,mealIds:draft.mealIds,savedAt:Date.now()}));}}
   }catch{/* An expired draft should not stop browsing. */}
  }).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[retry,draftKey]);
 function remember(c:PlanConditions,mealIds:string[]){try{localStorage.setItem(draftKey,encodeDraft(c,mealIds));}catch{/* Saving to an account remains available. */}}
 function returnToSetup(){
  setIds([]);setError('');setMessage('');setAllowSingleMenu(false);remember(conditions,[]);
  requestAnimationFrame(()=>{setupRef.current?.focus({preventScroll:true});setupRef.current?.scrollIntoView({behavior:'smooth',block:'start'});});
 }
 function update(patch:Partial<PlanConditions>){setAllowSingleMenu(false);const c={...conditions,...patch};if(c.slots&&c.days)c.meals=c.slots.length*c.days;setConditions(c);setIds([]);setMessage('');setError('');if(mode!=='settings')remember(c,[]);}
 async function generate(input=conditions){
  setMessage('');setError('');if(!progress.ready){setError('구매 상태를 먼저 불러와 주세요.');return;}const c=parseConditions({...input,startDate:emptyDashboard().today,supply:conditions.supply});
  if(!c){setError('챙길 끼니를 하나 이상 고르고 예산을 1,000~1,000,000원으로 입력해 주세요.');return;}
  setBusy(true);setIds([]);remember(c,[]);
  try{
   const response=await fetch('/api/shopping-plan',{cache:'no-store'});
   const data=await response.json();if(!response.ok)throw new Error(data.error);
   const fresh=(data.baseProducts??data.products) as PlanProduct[];setProducts(fresh);setProfileExcluded(data.excluded??[]);setPersonalization(data.personalization);
   if(data.personalization?.blocked)throw new Error('현재 신체 정보에서는 자동 맞춤 추천을 제공하지 않아요. 마이페이지 안내를 확인해 주세요.');
   if(mode==='settings'&&!data.personalization?.hasProfile)throw new Error('먼저 위의 신체 정보를 저장해 주세요. 저장한 정보를 기준으로 추천할게요.');
   const missing=mealSchedule(c).find((_,i)=>!slotCandidates(fresh,c,i).length);
   if(missing)throw new Error(`${slotLabels[missing.slot]}에 맞는 등록 상품이 부족해요. 해당 끼니를 빼거나 조리 방식·제외 재료를 조정해 주세요.`);
   const guide=shoppingBudgetGuide(fresh,c);
   if(!allowSingleMenu&&c.meals>1&&guide.count===1)throw new Error('현재 조건을 통과한 메뉴가 1개뿐이에요. 예산을 올려도 다양해지지 않아요. 아래 피할 재료의 체크와 조리 방식을 확인해 주세요.');
   if(!guide.approximate&&guide.minimum!==null&&c.budget<guide.minimum)throw new Error(`선택한 ${c.meals}끼를 준비하려면 최소 ${won(guide.minimum)}이 필요해요. 배송비는 별도이며 최저 구성은 같은 메뉴가 반복될 수 있어요.`);
   const next=recommendShopping(fresh,c);
   if(!next)throw new Error('현재 등록 상품으로는 조건에 맞는 식단을 채울 수 없어요. 예산·끼니 수·조리 방식을 조정해 주세요.');
   if(!allowSingleMenu&&c.meals>1&&new Set(next).size===1)throw new Error(`현재 예산에서는 같은 메뉴만 반복돼요.${guide.varietyMinimum!==null?` 반복을 줄인 구성은 약 ${won(guide.varietyMinimum)}부터 가능해요.`:' 조리 방식과 제외 재료를 확인해 주세요.'}`);
   setConditions(c);setIds(next);remember(c,next);setMessage(new Set(next).size===1&&next.length>1?`반복 허용에 따라 ${next.length}끼를 한 가지 메뉴로 구성했어요.`:`${next.length}끼를 ${new Set(next).size}종 메뉴로 구성했어요. 예산과 제외 재료를 지키면서 같은 메뉴가 덜 반복되도록 골랐어요.`);
  }catch(e){setError(e instanceof Error?e.message:'추천을 불러오지 못했어요.');}finally{setBusy(false);}
 }
 function chooseMeal(index:number,id:string){
  const c={...conditions,mealMode:'mixed' as const,cooking:'all' as const};
  if(!slotCandidates(products,c,index).some(p=>p.id===id))return;
  const next=ids.map((previous,i)=>i===index?id:previous);
  if(basketTotal(next,products,c.owned,c.supply)>c.budget){setError('장보기 예산을 초과해요. 예산을 조정해 주세요.');return;}
  setConditions(c);setIds(next);remember(c,next);setMessage('이 끼니를 바꾸고 겹치는 재료를 합쳐 구매 목록을 다시 계산했어요.');
 }
 async function resetCart(){
  const clean={...conditions,owned:[],supply:{}};
  const ok=await progress.reset(clean);
  if(ok){setIds([]);setConditions(clean);setConfirmReset(false);setError('');setMessage('추천 메뉴와 주문·보유 목록을 모두 초기화했어요. 새 식단을 추천받아 보세요.');}
 }
 function swap(index:number){const next=swapMeal(ids,index,products,conditions);if(!next){setMessage('예산과 제외 재료 조건에 맞는 다른 메뉴가 없어요.');return;}setIds(next);remember(conditions,next);setMessage('메뉴와 구매 수량을 함께 바꿨어요.');}
 function own(id:string){const c={...conditions,owned:conditions.owned.includes(id)?conditions.owned.filter(x=>x!==id):[...conditions.owned,id]};setConditions(c);remember(c,ids);setMessage('');}
 async function savePreferences(){
  const c=parseConditions(conditions);
  if(!c){setError('챙길 끼니를 하나 이상 고르고 예산을 1,000~1,000,000원으로 입력해 주세요.');return;}
  setBusy(true);setError('');setMessage('');
  try{
   const clean={...c,owned:[],supply:conditions.supply};
   if(userId){const r=await fetch('/api/shopping-plan',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({conditions:clean})});const d=await r.json();if(!r.ok)throw new Error(d.error);}
   localStorage.setItem(draftKey,encodeDraft(clean,[]));
   setIds([]);await generate(clean);
  }catch(e){setError(e instanceof Error?e.message:'설정을 저장하지 못했어요.');}finally{setBusy(false);}
 }
 async function save(){
  remember(conditions,ids);if(!userId){onLogin();return;}
  setBusy(true);setError('');setMessage('');
  try{const r=await fetch('/api/shopping-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conditions,mealIds:ids})});const d=await r.json();if(!r.ok)throw new Error(d.error);setMessage('식단을 계정에 저장했어요. 다른 기기에서도 홈에서 이어서 볼 수 있어요.');}
  catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요.');}finally{setBusy(false);}
 }
 async function restore(){
  setBusy(true);setError('');setMessage('');
  try{const r=await fetch('/api/shopping-plan?saved=1',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);if(!d.plan||!d.plan.mealIds?.length){setMessage('저장한 식단이 없거나 초기화된 상태예요. 새로 추천받아 주세요.');return;}
   const parsed=parseConditions({...d.plan.conditions,startDate:d.plan.conditions.startDate??emptyDashboard().today,supply:conditions.supply});if(!parsed)throw new Error('저장된 조건을 읽을 수 없어요.');const c=resolveShoppingExclusions(parsed,profileExcluded);setConditions(c);
   const valid=Array.isArray(d.plan.mealIds)&&validMealIds(d.plan.mealIds,products,c)&&basketTotal(d.plan.mealIds,products,c.owned,c.supply)<=c.budget;
   const next=valid?d.plan.mealIds:[];setIds(next);remember(c,next);setMessage(valid?'저장한 식단을 불러왔어요. 금액은 현재 등록 가격으로 계산했어요.':'상품 또는 가격이 바뀌었어요. 저장한 조건으로 다시 추천받아 주세요.');
  }catch(e){setError(e instanceof Error?e.message:'불러오지 못했어요.');}finally{setBusy(false);}
 }
 const schedule=mealSchedule(conditions);
 const remaining=remainingPlanPortions(ids.map((id,i)=>({id,date:planDate(conditions.startDate??intake.today,schedule[i].day)})),intake.today,intake.current?.logs??[]);
 const mealRows=basket(ids,products,conditions.owned,conditions.supply);
 const purchases=purchaseBasket(ids,products,conditions.owned,conditions.supply,remaining);
 const hasRecipes=mealRows.some(r=>r.product.recipe);
 const rows=purchases.map(r=>({...r,uses:mealRows.find(m=>m.product.id===r.product.id)?.uses??0})),total=rows.reduce((n,r)=>n+r.cost,0);

 return <section id={mode==='settings'?'shopping-settings':undefined} className="shopping-planner" aria-labelledby="planner-title">
  {mode==='cart'&&<section className="cart-reset" aria-label="장바구니 초기화">
   <button type="button" disabled={loading||busy||progress.busy||!progress.ready||(!ids.length&&!Object.values(progress.stock).some(i=>i.owned||i.ordered))} onClick={()=>setConfirmReset(true)}>모두 초기화</button>
   {confirmReset&&<div role="group" aria-label="장바구니 초기화 확인"><strong>추천 메뉴와 주문·보유 목록을 모두 비울까요?</strong><p>홈의 현재 추천 식단도 함께 비워요. 먹은 기록·식비 기록·예산과 취향·공유 링크는 유지돼요. 판매처의 실제 주문은 취소되지 않아요. 이 추천 밖에서 따로 관리하는 재료 목록과 함께 담은 장바구니는 별도예요.</p><button type="button" disabled={progress.busy} onClick={()=>setConfirmReset(false)}>취소</button><button type="button" disabled={progress.busy||!progress.ready} onClick={()=>void resetCart()}>{progress.busy?'초기화 중…':'확인, 모두 초기화'}</button></div>}
  </section>}
  {mode==='plan'&&<div className="home-steps"><span>💰 예산 정하기</span><span>→</span><strong>🍚 메뉴 고르기</strong><span>→</span><span>✓ 먹었어요</span></div>}
  {mode==='plan'&&<TodayMeals intake={intake} userId={userId} onLogin={onLogin} ids={ids} products={products} conditions={conditions} startDate={conditions.startDate??emptyDashboard().today} onStartDate={date=>{const c=parseConditions({...conditions,startDate:date});if(c){setConditions(c);remember(c,ids);}}} onSwap={swap} onChoose={chooseMeal} progress={progress} dailyCalories={personalization?.blocked?null:personalization?.dailyCalories??null} dashboard={dashboard}/>}
  {mode!=='settings'&&ids.length>1&&new Set(ids).size===1&&<p className="body-note" role="status">현재 조건에서는 한 가지 메뉴로만 구성됐어요. 예산·조리 방식·제외 재료 설정을 확인해 주세요. 다른 메뉴를 원하면 조건을 조정하고 다시 추천받아 주세요.</p>}
  {mode!=='settings'&&ids.length>0&&<details className="home-secondary"><summary>이 식단 공유하기</summary><SharePlanButton key={JSON.stringify([ids,conditions.days,conditions.slots])} userId={userId} onLogin={onLogin} conditions={conditions} mealIds={ids}/></details>}
  {mode==='plan'&&ids.length>0&&<button type="button" className="primary-button planner-restart" disabled={busy||progress.busy} onClick={returnToSetup}>추천 다시 받기</button>}
  {(mode!=='plan'||!ids.length)&&<details ref={setupRef} tabIndex={-1} className="planner-controls" open={mode==='settings'||mode==='plan'}><summary>{ids.length?'예산·취향 바꿔서 새로 추천받기':'내 예산으로 식단 준비하기'}</summary>
  <div className="planner-heading"><span>이번 주, 뭐 사서 먹지?</span><h2 id="planner-title">{mode==='settings'?'내 장보기 설정':mode==='cart'?'이번 주 살 것':'내 예산으로 챙기는 일주일'}</h2><p>{mode==='settings'?'자주 쓰는 예산과 식사 취향을 저장해 두세요. 다음 추천부터 다시 입력할 필요 없어요.':'간편식과 직접 만드는 한 끼를 비교하고, 겹치는 재료는 합쳐 예산 안에서 준비해요. 저장된 신체 정보와 식단 취향도 함께 반영해요.'}</p></div>
  {personalization&&<details className="planner-profile-summary"><summary>내 정보 반영 내용</summary><div className="meal-notice">{personalization.blocked?<p>현재 신체 정보에서는 자동 맞춤 추천을 제공하지 않아요.</p>:personalization.hasProfile?<><strong>내 정보 기준 · 하루 유지 필요량 약 {personalization.dailyCalories?.toLocaleString()} kcal</strong><p>하루 {personalization.meals}끼 기준 한 끼 약 {personalization.perMealCalories} kcal와 가까운 상품을 우선해요. 선택한 끼니만 추천하며 하루 전체 영양을 충족하는 식단은 아니에요.</p><small>{personalization.nutritionMatched?`영양 표시를 비교할 수 있는 상품 ${personalization.nutritionMatched}개`:'현재 상품은 영양 정보가 부족해 열량 기준의 비교가 어려워요. 확인되지 않은 값은 추정하지 않아요.'}</small></>:<p><Link href="/profile#profile-settings">신체 정보를 입력하면 내 필요 열량을 기준으로 추천받을 수 있어요 →</Link></p>}{personalization.style&&<p>식단 취향: {personalization.style} · 제외 재료: {(conditions.excluded??[]).map(key=>excludedFoods[key]).join(', ')||'없음'}</p>}</div></details>}
  {progress.error&&!ids.length&&mode!=='cart'&&<p role="alert">{progress.error} <button type="button" onClick={progress.reload}>구매 상태 다시 불러오기</button></p>}
  {mode!=='cart'&&<form className="planner-form" onSubmit={e=>{e.preventDefault();if(mode==='settings')void savePreferences();else void generate();}}>
   <label>며칠을 준비할까요?<select value={conditions.days??5} onChange={e=>update({days:Number(e.target.value),slots:conditions.slots??['dinner']})}>{[1,2,3,4,5,6,7].map(days=><option key={days} value={days}>{days}일</option>)}</select></label>
   <fieldset className="planner-slots"><legend>앱이 챙겨줄 끼니</legend>{(Object.keys(slotLabels) as MealSlot[]).map(slot=><label key={slot}><Checkbox checked={(conditions.slots??['dinner']).includes(slot)} onChange={e=>{const current=conditions.slots??['dinner'];update({days:conditions.days??5,slots:e.target.checked?[...current,slot].sort((a,b)=>Object.keys(slotLabels).indexOf(a)-Object.keys(slotLabels).indexOf(b)):current.filter(s=>s!==slot)});}}/>{slotLabels[slot]}</label>)}</fieldset>
   <small>밖에서 먹는 끼니는 선택하지 마세요. 아침은 아침용 상품이 등록된 경우에만 추천해요.</small>
   <label>이번 장보기 예산 (배송비 제외)<input type="number" min={1000} max={1000000} step={1} required value={conditions.budget||''} onChange={e=>update({budget:Number(e.target.value)})}/></label>
   {!loading&&progress.ready&&<details className="planner-budget-guide" open={budgetGuide.minimum===null||conditions.budget<budgetGuide.minimum}><summary>내 예산으로 얼마나 준비할 수 있나요?</summary>
    <strong>{conditions.days??schedule.at(-1)?.day}일 · {conditions.meals}끼 예산 가이드</strong>
    <p>현재 추천 후보 {budgetGuide.count}종 · {budgetGuide.options.map(o=>`${slotLabels[o.slot]} ${o.count}종`).join(' / ')}</p>
    {budgetGuide.minimum===null?<p>선택한 끼니를 채울 상품이 부족해요. 조리 방식·끼니·제외 재료를 확인해 주세요.</p>:<>
     <p>{budgetGuide.approximate?'찾은 절약 구성':'최저 구매 금액'} <b>{won(budgetGuide.minimum)}</b> <small>{budgetGuide.approximate?'탐색 결과 · 최저가 보장 아님':'같은 메뉴 반복 가능'}</small></p>
     {budgetGuide.count>1&&budgetGuide.varietyMinimum!==null?<p>반복을 줄인 구성 <b>{won(budgetGuide.varietyMinimum)}{budgetGuide.varietyUpper!==budgetGuide.varietyMinimum?` ~ ${won(budgetGuide.varietyUpper!)}`:''}</b></p>:conditions.meals>1?<p role="status">후보가 한 가지뿐이라 예산을 올려도 메뉴가 다양해지지 않아요.</p>:null}
     {conditions.budget<budgetGuide.minimum&&<p role="status">{budgetGuide.approximate?'이 절약 구성은 현재 예산보다':'현재 예산에서'} {won(budgetGuide.minimum-conditions.budget)} {budgetGuide.approximate?'더 들어요':'더 필요해요' }.</p>}
     <div className="planner-presets">{[...new Set([budgetGuide.minimum,budgetGuide.varietyMinimum,budgetGuide.varietyUpper].filter((n):n is number=>n!==null).map(n=>Math.max(1000,Math.ceil(n/1000)*1000)))].filter(n=>n<=1000000).map(n=><button type="button" key={n} aria-pressed={conditions.budget===n} onClick={()=>update({budget:n})}>{won(n)}으로 설정</button>)}</div>
    </>}
    <small>현재 판매 묶음 가격과 주문·보유 수량 기준 · 배송비 별도. 최소 금액은 영양 목표를 충족하는 금액이 아니에요.</small>
    <a href="#planner-exclusions" onClick={()=>setShowExclusions(true)}>피할 재료 상세 확인 ↓</a>
    {conditions.meals>1&&(budgetGuide.count===1||(budgetGuide.varietyMinimum!==null&&conditions.budget<budgetGuide.varietyMinimum))&&<label><Checkbox checked={allowSingleMenu} onChange={e=>setAllowSingleMenu(e.target.checked)}/> 한 가지 메뉴로만 구성되어도 괜찮아요</label>}
   </details>}
   <details className="planner-more-options"><summary>먹는 방식·조리 설정</summary><label>어떻게 먹을까요?<select value={conditions.mealMode??'ready'} onChange={e=>update({mealMode:e.target.value as PlanConditions['mealMode']})}><option value="mixed">둘 다 · 간편식과 직접 요리 비교</option><option value="ready">간편식 위주</option><option value="cook">직접 요리</option></select></label>
   <small>직접 요리는 판매 구성이 확인된 재료로 추천해요. 한 끼 재료비와 실제 구매할 묶음 금액을 따로 계산해요.</small>
   {conditions.mealMode!=='cook'&&<label>간편식 조리 방식<select value={conditions.cooking} onChange={e=>update({cooking:e.target.value as PlanConditions['cooking']})}><option value="all">간편식과 밀키트 골고루</option><option value="quick">데우거나 볶는 간편식 위주</option><option value="kit">밀키트 조리 가능</option></select></label>}
   </details><div id="planner-exclusions">
   {mode==='plan'&&<div className="planner-exclusions-toggle"><span>피할 재료 · {(conditions.excluded??[]).length}개 선택{conditions.avoid.trim()?' · 직접 입력 있음':''}</span><button type="button" aria-expanded={showExclusions} aria-controls="planner-exclusions-fields" onClick={()=>setShowExclusions(value=>!value)}>{showExclusions?'접기':'상세'}</button></div>}
   {(mode!=='plan'||showExclusions)&&<fieldset id="planner-exclusions-fields" className="planner-exclusions" disabled={loading||busy}>
    <legend>피할 재료 · {(conditions.excluded??[]).length}개 선택</legend>
    <p>체크한 재료는 이번 식단에서 제외해요. 처음에는 마이에 저장된 선택을 가져와요.</p>
    <strong className="planner-exclusion-summary">{conditions.excluded?.length?conditions.excluded.map(key=>excludedFoods[key]).join(' · '):'체크한 제외 재료 없음'}</strong>
    <div className="planner-exclusion-actions"><button type="button" onClick={()=>update({excluded:[],avoid:''})}>제외 선택 모두 해제</button>{userId&&<button type="button" onClick={()=>update({excluded:[...profileExcluded],avoid:''})}>마이 설정 가져오기</button>}</div>
    {excludedFoodGroups.map(group=><div className="planner-exclusion-group" key={group.label}><span>{group.label}</span><div>{group.keys.map(key=><label key={key} className={(conditions.excluded??[]).includes(key)?'is-checked':''}><Checkbox checked={(conditions.excluded??[]).includes(key)} onChange={e=>update({excluded:e.target.checked?[...(conditions.excluded??[]),key]:(conditions.excluded??[]).filter(k=>k!==key)})}/>{excludedFoods[key]}</label>)}</div></div>)}
    <label>목록에 없는 재료 추가 (선택)<input value={conditions.avoid} maxLength={200} placeholder="예: 고수, 가지 — 쉼표로 구분" onChange={e=>update({avoid:e.target.value})}/></label>
    <small>여기서 바꾼 선택은 이번 추천과 저장하는 식단에 적용돼요. 마이의 기본 제외 재료는 그대로 유지돼요.</small>
   <small>등록된 상품명·원문 알레르기 표시에서 찾아 제외해요. 알레르기가 있다면 구매 전 전체 원재료와 제조시설 표시를 확인해 주세요.</small>
   </fieldset>}
   </div>
   <button className="primary-button" disabled={loading||busy||!progress.ready||(mode!=='settings'&&!products.length)}>{loading?'설정 불러오는 중…':busy?(mode==='settings'?'저장 중…':'추천 준비 중…'):mode==='settings'?'저장하고 내 정보로 추천받기':'이번 주 살 것 추천받기 →'}</button>
  </form>}
  </details>}
  {mode!=='settings'&&!loading&&!products.length&&<p>현재 추천할 수 있는 상품이 없어요. 판매 구성과 출처가 확인된 상품을 준비하고 있어요.</p>}
  {error&&<p className="auth-error" role="alert">{error}</p>}
  {mode!=='settings'&&!loading&&!products.length&&<button type="button" onClick={()=>{setLoading(true);setRetry(n=>n+1);}}>상품 다시 불러오기</button>}
  {mode!=='settings'&&userId&&<button type="button" className="text-link" disabled={loading||busy||!progress.ready} onClick={restore}>저장한 식단 불러오기 →</button>}
  {!!ids.length&&<details className="planner-result" open={mode!=='plan'}><summary>준비한 식단 전체 · 구매 목록 ({ids.length}끼)</summary>
   {hasRecipes&&<section className="recipe-plan-list" aria-label="직접 요리하는 끼니"><h3>🍳 직접 만들어 먹어요</h3><RecipePurchaseNote ids={ids} products={products} conditions={conditions}/>{ids.map((id,i)=>{const p=products.find(p=>p.id===id)!;return p.recipe?<article key={i}><small>{schedule[i].day}일차 · {slotLabels[schedule[i].slot]}</small><div><MealSourceBadge product={p}/></div><h4>{p.name}</h4><strong>한 끼 재료비 약 {won(p.price)}</strong><RecipeProductPreview product={p}/><MealComparison key={p.id} product={p} index={i} ids={ids} products={products} conditions={conditions} onChoose={chooseMeal} disabled={busy||progress.busy}/></article>:null;})}</section>}
   <ShoppingProgress guest={!userId} progress={progress} recommended
    summary={<div className="planner-total"><span>남은 식단 추가 구매 예상금액</span><strong>{won(total)}</strong><small>{total<=conditions.budget?`예산에서 ${won(conditions.budget-total)} 남아요`:`예산을 ${won(total-conditions.budget)} 초과했어요`} · 배송비 별도</small></div>}
    heading={<><h3>{hasRecipes?'함께 준비할 상품·재료':'이렇게 먹어요'}</h3><p className="body-note">추천 메뉴에서 살 것을 바로 선택하세요. 같은 메뉴라도 먹는 날은 따로 표시해요. 구매할 수량은 카드 아래에 한 번에 모았어요. 1회분 가격은 등록 판매가를 나눈 금액이며 실제 구매는 판매 묶음 단위예요.</p></>}
    items={rows.map(r=>({id:r.product.id,name:r.product.name,unit:'묶음',required:r.required,packSize:1,url:r.product.productUrl,price:r.product.price,detail:r.uses?`${r.product.detail} · 전체 ${r.uses}회분 · 앞으로 ${remaining[r.product.id]??0}회분`:`${r.product.detail} · 필요한 양 ${ingredientAmount(r.product,r.required)} · 식단 준비 후 남는 양 ${ingredientAmount(r.product,r.left)}`,
     thumbnail:<ProductThumb item={r.product}/>,
     recommendation:r.uses>0?<div className="planner-recommendation">
      <div className="planner-price-line"><b className="planner-meal-price">한 끼 {r.product.servings>1?'약 ':''}{won(Math.round(r.product.price/r.product.servings))}</b><span>판매 1묶음 {won(r.product.price)} · {r.product.servings}회분</span></div>
      <small className="planner-nutrition-note">{r.product.servingCalories!=null?`표시 영양 기준 약 ${r.product.servingCalories} kcal/회분${personalization?.perMealCalories?` · 내 한 끼 참고량 ${personalization.perMealCalories} kcal`:''}`:'열량 미확인'}</small>
      <div className="planner-schedule-heading"><strong><span aria-hidden="true">🍽️</span> {r.uses>1?`이 메뉴는 ${r.uses}번 먹어요`:'이날 먹을 한 끼'}</strong><small>{r.uses>1?'날짜마다 1회분씩, 따로 먹는 식사예요.':'먹는 날과 양을 확인해 주세요.'}</small></div>
      <div className="planner-card-schedule" aria-label={`${r.product.name} 먹는 일정`}>{ids.flatMap((id,i)=>id===r.product.id?[<div key={i} className={`planner-day-card day-tone-${(schedule[i].day-1)%4}`}>
       <div className="planner-day-badge"><b>{schedule[i].day}</b><span>일차</span></div>
       <div className="planner-day-meal"><strong><span aria-hidden="true">{schedule[i].slot==='breakfast'?'☀️':schedule[i].slot==='lunch'?'🌤️':'🌙'}</span> {slotLabels[schedule[i].slot]}</strong><span>이날 먹을 양 <b>1회분</b></span></div>
       <button type="button" disabled={busy||progress.busy} onClick={()=>swap(i)} aria-label={`${schedule[i].day}일차 ${slotLabels[schedule[i].slot]} 메뉴 바꾸기`}>이 끼니 바꾸기 <span aria-hidden="true">↻</span></button>
      </div>]:[])}</div>
     </div>:<p>여러 끼니에 쓰는 재료를 합쳤어요. 판매 1묶음 {won(r.product.price)}</p>
    }))}/>
   {!!conditions.owned.length&&<details><summary>이전에 체크한 보유 상품</summary>{rows.filter(r=>r.have).map(r=><label key={r.product.id}><Checkbox checked onChange={()=>own(r.product.id)}/>{r.product.name} · 이미 있어요</label>)}</details>}
   <button type="button" className="primary-button" disabled={busy||total>conditions.budget} onClick={save}>{busy?'저장 중…':userId?'이 식단 저장하기':'로그인하고 이 식단 저장하기'}</button>
  </details>}
  {mode==='cart'&&!ids.length&&<ShoppingProgress guest={!userId} progress={progress} items={[]}/>}
  {mode!=='cart'&&!!ids.length&&<Link href="/cart">이번 주 구매 목록 보러 가기 →</Link>}
  {mode==='cart'&&!ids.length&&<p><Link href="/">홈에서 이번 주 살 것 추천받기 →</Link></p>}
  {mode==='settings'&&<div className="profile-shopping-links"><Link href="/">내 설정으로 추천받기 →</Link><Link href="/cart">이번 주 구매 목록 →</Link>{!userId&&<small>로그인하면 설정을 계정에 저장할 수 있어요.</small>}</div>}
  {message&&<p role="status" className="body-note">{message}</p>}
 </section>;
}
