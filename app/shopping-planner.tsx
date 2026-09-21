'use client';
import {RiceBuddy} from './rice-buddy';
import adoptionStyles from './plan-adoption.module.css';
import {shoppingAvailabilityMessage} from '../lib/shopping-availability';
import {cookingDishId,repeatsDailyMain} from '../lib/shopping-plan';
import {CookingShoppingGuide} from './cooking-shopping-guide';
import {MealKindPicker} from './meal-kind-picker';
import {MealModePicker} from './meal-mode-picker';
import {mealKinds,type MealKind} from '../lib/meal-kinds';
import {trackPlanner} from '../lib/track-planner';
import {recommendationReasons} from '../lib/plan-explanation';
import {PlanPurchaseSummary} from './plan-purchase-summary';
import {usePlannerLocale} from './planner-locale';
import {BudgetModePicker} from './budget-mode-picker';
import {servingNutrients,nutritionIsEstimated} from '../lib/serving-nutrients';
import {shoppingGoals,budgetModes} from '../lib/shopping-goals';
import {RecommendationFeedback} from './recommendation-feedback';
import {ShoppingGoalPicker} from './shopping-goal-picker';

import {MealComparison,RecipePurchaseNote} from './meal-comparison';
import {useFoodIntake} from './food-intake';
import {remainingPlanPortions,planDate} from '../lib/daily-plan';
import {TodayMeals} from './today-meals';
import {SharePlanButton} from './share-plan-button';
import {type DashboardData} from '../lib/dashboard';
import { Checkbox } from "./components/checkbox";
import { useLoadingTask } from "./app-loading";
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type {personalizeProducts} from '../lib/shopping-personalization';
import { ProductThumb } from './product-thumb';
import {MealSourceBadge,RecipeProductPreview} from './meal-source';
import { MAX_PLAN_DAYS, mealFamily, swapReasons, type SwapReason, basket, purchaseBasket, basketTotal, validMealIds, slotCandidates, mealSchedule, slotLabels, initialConditions, parseConditions, swapMeal, type MealSlot, type PlanConditions, type PlanProduct } from '../lib/shopping-plan';
import './shopping-planner.css';
import './planner-onboarding.css';
import {shoppingBudgetGuide,suggestedShoppingBudget} from '../lib/shopping-budget';
import {excludedFoods,excludedFoodGroups,type ExcludedFood} from '../lib/excluded-foods';
import {resolveShoppingExclusions} from '../lib/shopping-exclusions';
import {ShoppingProgress,useShoppingProgress} from './shopping-progress';

function useBudgetGuide(products:PlanProduct[],key:string){
 const [result,setResult]=useState<{products:PlanProduct[];key:string;guide:ReturnType<typeof shoppingBudgetGuide>|null}|null>(null);
 useEffect(()=>{
  if(!products.length)return;
  const worker=new Worker(new URL('./shopping-budget.worker.ts',import.meta.url));
  worker.onmessage=event=>setResult({products,key,guide:event.data.guide??null});
  worker.onerror=()=>setResult({products,key,guide:null});
  worker.postMessage({products,conditions:JSON.parse(key)});
  return()=>worker.terminate();
 },[products,key]);
 const current=result?.products===products&&result.key===key;
 return {guide:current?result.guide:null,pending:products.length>0&&!current};
}
const taiwanConditions:PlanConditions={...initialConditions,mealMode:'ready',budget:60000};
function ingredientAmount(p:PlanProduct,packs:number){
 const count=p.unit==='개'&&p.quantity>1;
 const unit=count?'개':p.servingGrams?'g':'묶음';
 return `${Number((packs*(count?p.quantity:p.servingGrams??1)).toFixed(1))}${unit}`;
}
function encodeDraft(conditions:PlanConditions,mealIds:string[]){return JSON.stringify({conditions,mealIds,savedAt:Date.now()});}
export function ShoppingPlanner({userId,onLogin,mode='plan',dashboard}:{userId?:string;onLogin:()=>void;mode?:'plan'|'cart'|'settings';dashboard?:DashboardData|null}){
 const locale=usePlannerLocale();
 const startLoading=useLoadingTask();
 const won=locale.money;
 useEffect(()=>{if(!locale.isTaiwan&&mode!=='settings')trackPlanner('visit');},[locale.isTaiwan,mode]);
 const endpoint=locale.isTaiwan?'/api/taiwan/catalog':'/api/shopping-plan';
 const defaultConditions=locale.isTaiwan?taiwanConditions:initialConditions;
 const draftKey=`kkiniplan-shopping-draft-v2-${locale.isTaiwan?'guest':userId??'guest'}${locale.storageSuffix}`;
 const preferenceQueue=useRef(Promise.resolve());
 const setupRef=useRef<HTMLDetailsElement>(null);
 const plannerRef=useRef<HTMLElement>(null);
 const [resultFocus,setResultFocus]=useState(0);
 useEffect(()=>{
  if(!resultFocus)return;
  const heading=plannerRef.current?.querySelector<HTMLElement>('[data-recommended-menu-heading]');
  heading?.focus({preventScroll:true});
  heading?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const animations=Array.from(plannerRef.current?.querySelectorAll<HTMLElement>('.today-menu')??[])
   .map(card=>card.animate([{opacity:0.4,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'ease-out'}));
  return()=>animations.forEach(animation=>animation.cancel());
 },[resultFocus]);
 const [personalization,setPersonalization]=useState<ReturnType<typeof personalizeProducts>['personalization']|null>(null);
 const [profileExcluded,setProfileExcluded]=useState<ExcludedFood[]>([]);
 const progress=useShoppingProgress(userId,'products');
 const intake=useFoodIntake(mode==='settings'?undefined:userId);
 const [products,setProducts]=useState<PlanProduct[]>([]),[baseConditions,setConditions]=useState<PlanConditions>(defaultConditions);
 const [automaticBudget,setAutomaticBudget]=useState(false);
 const budgetConditions:PlanConditions={...baseConditions,supply:Object.fromEntries(Object.values(progress.stock).map(i=>[i.id,i.owned+i.ordered]))};
 const [ids,setIds]=useState<string[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const previousRecommendation=useRef<string[]>([]);
 const recommendationWorker=useRef<Worker|null>(null);
 useEffect(()=>()=>recommendationWorker.current?.terminate(),[]);
 useEffect(()=>{if(ids.length)previousRecommendation.current=ids;},[ids]);
 const guideKey=JSON.stringify({...budgetConditions,budget:1000000,startDate:undefined});
 const {guide:budgetGuide,pending:budgetPending}=useBudgetGuide(products,guideKey);
 const suggestedBudget=suggestedShoppingBudget(budgetGuide);
 const waitingForBudget=!locale.isTaiwan&&automaticBudget&&budgetPending;
 const conditions:PlanConditions={...budgetConditions,budget:!locale.isTaiwan&&!ids.length&&automaticBudget&&suggestedBudget!==null?suggestedBudget:budgetConditions.budget};
 const [showExclusions,setShowExclusions]=useState(false);
 const [moreOptions,setMoreOptions]=useState(mode==='settings');
 const [formMode,setFormMode]=useState<'ultra'|'simple'|'detailed'>(mode==='settings'?'detailed':'ultra');
 const simple=mode==='plan'&&!locale.isTaiwan&&formMode==='simple';
 const ultra=mode==='plan'&&!locale.isTaiwan&&formMode==='ultra';
 const detailedView=!simple&&!ultra;
 const [confirmReset,setConfirmReset]=useState(false);
 const [customMeals,setCustomMeals]=useState(false);
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[retry,setRetry]=useState(0);
 const adopting=useRef(false);
 useEffect(()=>{
  if(!userId||locale.isTaiwan||loading||adopting.current)return;
  let pending;try{pending=JSON.parse(sessionStorage.getItem('ggini-pending-adoption')??'null');}catch{return;}
  const c=parseConditions(pending?.conditions);
  if(!c||!Array.isArray(pending?.mealIds)||!Number.isFinite(pending.savedAt)||Date.now()-pending.savedAt>86400000)return;
  adopting.current=true;
  Promise.resolve().then(()=>{setBusy(true);return fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conditions:c,mealIds:pending.mealIds})});}).then(async r=>{
   const d=await r.json();if(!r.ok)throw new Error(d.error);
   sessionStorage.removeItem('ggini-pending-adoption');
   localStorage.setItem(draftKey,encodeDraft(c,pending.mealIds));setConditions(c);setIds(pending.mealIds);
   setMessage('골라둔 식단을 계정에 저장했어요. 준비한 뒤 먹었어요를 눌러 식비와 영양 기록을 쌓아 보세요.');
  }).catch(e=>setError(e instanceof Error?e.message:'선택한 식단을 저장하지 못했어요. 이대로 먹기를 다시 눌러 주세요.')).finally(()=>{setBusy(false);adopting.current=false;});
 },[userId,locale.isTaiwan,loading,endpoint,draftKey]);
 useEffect(()=>{
  const controller=new AbortController();
  const finishLoading=startLoading('나에게 맞는 장보기를 준비하고 있어요');
  fetch(endpoint,{cache:'no-store',signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);return d;}).then(d=>{
   const catalog=d.baseProducts??d.products,defaults=d.excluded??[];
   setProducts(catalog);setProfileExcluded(defaults);setPersonalization(d.personalization);setError('');setIds([]);
   const saved=parseConditions(d.preferences);setAutomaticBudget(!saved);setConditions(resolveShoppingExclusions({... (saved??defaultConditions),goal:saved?.goal??'maintain'},defaults));
   try{
    const guestKey='kkiniplan-shopping-draft-v2-guest'+locale.storageSuffix;
    if(d.resetAt)for(const storage of [localStorage,sessionStorage])for(const key of [draftKey,guestKey]){
     const raw=storage.getItem(key);
     if(raw&&Number(JSON.parse(raw)?.savedAt??0)<=Date.parse(d.resetAt))storage.removeItem(key);
    }
    if(draftKey!==guestKey&&!localStorage.getItem(draftKey)&&!sessionStorage.getItem(draftKey)){
     const guest=localStorage.getItem(guestKey)??sessionStorage.getItem(guestKey);
     if(guest&&parseConditions(JSON.parse(guest)?.conditions)){localStorage.setItem(draftKey,guest);localStorage.removeItem(guestKey);sessionStorage.removeItem(guestKey);}
    }
    const draft=JSON.parse(localStorage.getItem(draftKey)??sessionStorage.getItem(draftKey)??'null')??d.plan;const c=parseConditions(draft?.conditions);
    if(c){setAutomaticBudget(false);const resolved=resolveShoppingExclusions({...c,swapPreferences:saved?.swapPreferences??c.swapPreferences,mealKinds:saved?.mealKinds??c.mealKinds,budgetMode:saved?.budgetMode??c.budgetMode,goal:saved?.goal??c.goal??'maintain'},defaults);resolved.startDate??=locale.today();setConditions(resolved);if(Array.isArray(draft.mealIds)&&validMealIds(draft.mealIds,catalog,resolved)){setIds(draft.mealIds);localStorage.setItem(draftKey,JSON.stringify({conditions:resolved,mealIds:draft.mealIds,savedAt:Date.now()}));}}
   }catch{/* An expired draft should not stop browsing. */}
  }).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);finishLoading();});
  return()=>{controller.abort();finishLoading();};
 },[retry,draftKey,locale,endpoint,defaultConditions,startLoading]);
 function remember(c:PlanConditions,mealIds:string[]){try{localStorage.setItem(draftKey,encodeDraft(c,mealIds));}catch{/* Saving to an account remains available. */}}
 function updateMealKinds(mealKinds:MealKind[]){updatePreferences({mealKinds});}
 function updatePreferences(patch:Partial<Pick<PlanConditions,'mealKinds'|'goal'|'budgetMode'|'swapPreferences'>>){
  update(patch);remember({...conditions,...patch},[]);
  if(userId&&!locale.isTaiwan){preferenceQueue.current=preferenceQueue.current.catch(()=>{}).then(async()=>{try{const r=await fetch(endpoint,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)});if(!r.ok)throw new Error();}catch{setError('선택은 이 기기에 저장했지만 계정 저장에 실패했어요. 마이페이지에서 다시 저장해 주세요.');}});}
 }
 function returnToSetup(){
  setIds([]);setError('');setMessage('');remember(conditions,[]);
  requestAnimationFrame(()=>{setupRef.current?.focus({preventScroll:true});setupRef.current?.scrollIntoView({behavior:'smooth',block:'start'});});
 }
 function update(patch:Partial<PlanConditions>){if(patch.budget!==undefined)setAutomaticBudget(false);const c={...conditions,...patch};if(c.slots&&c.days){if(c.mealCountMode)c.days=Math.ceil(c.meals/c.slots.length);else c.meals=c.slots.length*c.days;}setConditions(c);setIds([]);setMessage('');setError('');if(mode!=='settings')remember(c,[]);}
 async function generate(input=conditions){
  setMessage('');setError('');if(!progress.ready){setError('구매 상태를 먼저 불러와 주세요.');return;}const c=parseConditions({...input,startDate:locale.today(),supply:conditions.supply});
  if(!c){setError('챙길 끼니를 하나 이상 고르고 예산을 1,000~1,000,000원으로 입력해 주세요.');return;}
  setBusy(true);setIds([]);remember(c,[]);
  const finishLoading=startLoading('입맛에 맞는 메뉴를 찾고 있어요');
  try{
   const response=await fetch(endpoint,{cache:'no-store'});
   const data=await response.json();if(!response.ok)throw new Error(data.error);
   const fresh=(data.baseProducts??data.products) as PlanProduct[];setProducts(fresh);setProfileExcluded(data.excluded??[]);setPersonalization(data.personalization);
   if(data.personalization?.blocked)throw new Error('현재 신체 정보에서는 자동 맞춤 추천을 제공하지 않아요. 마이페이지 안내를 확인해 주세요.');
   if(mode==='settings'&&!data.personalization?.hasProfile)throw new Error('먼저 위의 신체 정보를 저장해 주세요. 저장한 정보를 기준으로 추천할게요.');
   const availabilityMessage=shoppingAvailabilityMessage(fresh,c);
   if(availabilityMessage)throw new Error(availabilityMessage);
   const missing=mealSchedule(c).find((_,i)=>!slotCandidates(fresh,c,i).length);
   if(missing)throw new Error(`${slotLabels[missing.slot]}에 맞는 등록 상품이 부족해요. 해당 끼니를 빼거나 음식 종류·식단 목표·조리 방식·제외 재료를 조정해 주세요.`);
   const {guide,next}=await new Promise<{guide:ReturnType<typeof shoppingBudgetGuide>;next:string[]|null}>((resolve,reject)=>{
    const worker=new Worker(new URL('./shopping-recommend.worker.ts',import.meta.url));
    recommendationWorker.current=worker;
    const finish=()=>{worker.terminate();if(recommendationWorker.current===worker)recommendationWorker.current=null;};
    worker.onmessage=event=>{finish();if(event.data.error)reject(new Error(event.data.error));else resolve(event.data);};
    worker.onerror=()=>{finish();reject(new Error('추천을 계산하지 못했어요. 다시 시도해 주세요.'));};
    worker.postMessage({products:fresh,conditions:c,previous:previousRecommendation.current});
   });
   if(!guide.approximate&&guide.minimum!==null&&c.budget<guide.minimum)throw new Error(`선택한 ${c.meals}끼를 준비하려면 최소 ${won(guide.minimum)}이 필요해요. 배송비는 별도예요.`);
   if(!next)throw new Error('현재 조건과 예산으로는 중복 없는 식단을 채울 수 없어요. 기간·끼니 수를 줄이거나 음식 종류·예산·조리 방식을 조정해 주세요.');
   if(!locale.isTaiwan&&mode!=='settings')trackPlanner('generated');setConditions(c);setIds(next);remember(c,next);setMessage(`${next.length}끼를 서로 다른 ${next.length}종 메뉴로 구성했어요. 같은 음식은 중복으로 넣지 않았어요.`);setResultFocus(n=>n+1);
  }catch(e){setError(e instanceof Error?e.message:'추천을 불러오지 못했어요.');}finally{setBusy(false);finishLoading();}
 }
 function chooseMeal(index:number,id:string){
  const c={...conditions,mealMode:'mixed' as const,cooking:'all' as const};
  if(!slotCandidates(products,c,index).some(p=>p.id===id))return;
  if(ids.some((existing,i)=>i!==index&&cookingDishId(existing)===cookingDishId(id))){setError('이미 다른 끼니에 있는 메뉴예요. 다른 음식을 골라 주세요.');return;}
  const choice=products.find(p=>p.id===id);
  if(choice&&repeatsDailyMain(ids,products,c,index,choice)){setError('같은 날 다른 끼니와 주재료가 겹쳐요. 다른 주재료의 메뉴를 골라 주세요.');return;}
  const next=ids.map((previous,i)=>i===index?id:previous);
  if(basketTotal(next,products,c.owned,c.supply,c.people)>c.budget){setError('장보기 예산을 초과해요. 예산을 조정해 주세요.');return;}
  if(next[index]!==ids[index]&&!locale.isTaiwan)trackPlanner('swapped');setConditions(c);setIds(next);remember(c,next);setMessage('이 끼니를 바꾸고 겹치는 재료를 합쳐 구매 목록을 다시 계산했어요.');
 }
 async function resetCart(){
  const clean={...conditions,owned:[],supply:{}};
  const ok=await progress.reset(clean);
  if(ok){setIds([]);setConditions(clean);setConfirmReset(false);setError('');setMessage('추천 메뉴와 주문·보유 목록을 모두 초기화했어요. 새 식단을 추천받아 보세요.');}
 }
 function swap(index:number,reason?:SwapReason){
  const old=products.find(p=>p.id===ids[index]);if(!old)return;
  const swapPreferences=reason?[...(conditions.swapPreferences??[]).filter(f=>!(f.id===old.id&&f.reason===reason)),{id:old.id,family:mealFamily(old),reason,price:old.price/old.servings,minutes:old.recipe?.minutes??(old.category==='meal_kit'?20:5)}].slice(-50):conditions.swapPreferences;
  const c={...conditions,swapPreferences};
  const next=swapMeal(ids,index,products,c,reason);
  if(reason){updatePreferences({swapPreferences});setIds(next??ids);remember(c,next??ids);}
  if(!next){setMessage(reason?`‘${swapReasons[reason]}’ 의견을 저장했어요. 현재 예산·제외 재료 안에서 이 이유에 맞게 바꿀 메뉴가 없어요.`:'예산과 제외 재료 조건에 맞는 다른 메뉴가 없어요.');return;}
  if(!locale.isTaiwan)trackPlanner('swapped');setIds(next);remember(c,next);setMessage(reason?`‘${swapReasons[reason]}’ 의견을 반영해 바꿨어요. 다음 추천에도 반영해요.`:'메뉴와 구매 수량을 함께 바꿨어요.');
 }
 function own(id:string){const c={...conditions,owned:conditions.owned.includes(id)?conditions.owned.filter(x=>x!==id):[...conditions.owned,id]};setConditions(c);remember(c,ids);setMessage('');}
 async function savePreferences(){
  const c=parseConditions(conditions);
  if(!c){setError('챙길 끼니를 하나 이상 고르고 예산을 1,000~1,000,000원으로 입력해 주세요.');return;}
  setBusy(true);setError('');setMessage('');
  try{
   await preferenceQueue.current;
   const clean={...c,owned:[],supply:conditions.supply};
   if(userId&&!locale.isTaiwan){const r=await fetch(endpoint,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({conditions:clean})});const d=await r.json();if(!r.ok)throw new Error(d.error);}
   localStorage.setItem(draftKey,encodeDraft(clean,[]));
   setIds([]);await generate(clean);
  }catch(e){setError(e instanceof Error?e.message:'설정을 저장하지 못했어요.');}finally{setBusy(false);}
 }
 async function save(){
  remember(conditions,ids);if(locale.isTaiwan){setMessage('已儲存在這個瀏覽器。');return;}if(!userId){try{sessionStorage.setItem('ggini-pending-adoption',encodeDraft(conditions,ids));}catch{setError('선택을 보관하지 못했어요. 로그인 후 이 식단을 다시 저장해 주세요.');}onLogin();return;}
  setBusy(true);setError('');setMessage('');
   try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conditions,mealIds:ids})});const d=await r.json();if(!r.ok)throw new Error(d.error);sessionStorage.removeItem('ggini-pending-adoption');setMessage('식단을 계정에 저장했어요. 준비한 뒤 먹었어요를 누르면 식비와 영양 기록이 쌓여요.');}
  catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요.');}finally{setBusy(false);}
 }
 async function restore(){
  setBusy(true);setError('');setMessage('');
  try{const r=await fetch(endpoint+'?saved=1',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);if(!d.plan||!d.plan.mealIds?.length){setMessage('저장한 식단이 없거나 초기화된 상태예요. 새로 추천받아 주세요.');return;}
   const parsed=parseConditions({...d.plan.conditions,startDate:d.plan.conditions.startDate??locale.today(),supply:conditions.supply});if(!parsed)throw new Error('저장된 조건을 읽을 수 없어요.');const c=resolveShoppingExclusions(parsed,profileExcluded);setConditions(c);
   const valid=Array.isArray(d.plan.mealIds)&&validMealIds(d.plan.mealIds,products,c)&&basketTotal(d.plan.mealIds,products,c.owned,c.supply,c.people)<=c.budget;
   const next=valid?d.plan.mealIds:[];setIds(next);remember(c,next);setMessage(valid?'저장한 식단을 불러왔어요. 금액은 현재 등록 가격으로 계산했어요.':'상품 또는 가격이 바뀌었어요. 저장한 조건으로 다시 추천받아 주세요.');
  }catch(e){setError(e instanceof Error?e.message:'불러오지 못했어요.');}finally{setBusy(false);}
 }
 const schedule=mealSchedule(conditions);
 const remaining=remainingPlanPortions(ids.map((id,i)=>({id,date:planDate(conditions.startDate??intake.today,schedule[i].day)})),intake.today,intake.current?.logs??[],conditions.people);
 const mealRows=basket(ids,products,conditions.owned,conditions.supply,conditions.people);
 const purchases=purchaseBasket(ids,products,conditions.owned,conditions.supply,remaining);
 const hasRecipes=mealRows.some(r=>r.product.recipe);
 const rows=purchases.map(r=>({...r,uses:mealRows.find(m=>m.product.id===r.product.id)?.uses??0})),total=rows.reduce((n,r)=>n+r.cost,0);

 return locale.render(<section onClickCapture={e=>{if(locale.isTaiwan)return;const a=(e.target as Element).closest('a');if(a&&products.some(p=>p.productUrl===a.href||p.recipe?.ingredients.some(i=>i.product.productUrl===a.href)))trackPlanner('seller');}} ref={plannerRef} id={mode==='settings'?'shopping-settings':undefined} className={`shopping-planner${mode==='plan'?' home-planner':''}${!ids.length?' planner-empty':''}`} aria-labelledby="planner-title">
  {mode==='cart'&&<section className="cart-reset" aria-label="장바구니 초기화">
   <button type="button" disabled={loading||busy||progress.busy||!progress.ready||(!ids.length&&!Object.values(progress.stock).some(i=>i.owned||i.ordered))} onClick={()=>setConfirmReset(true)}>모두 초기화</button>
   {confirmReset&&<div role="group" aria-label="장바구니 초기화 확인"><strong>추천 메뉴와 주문·보유 목록을 모두 비울까요?</strong><p>홈의 현재 추천 식단도 함께 비워요. 먹은 기록·식비 기록·예산과 취향·공유 링크는 유지돼요. 판매처의 실제 주문은 취소되지 않아요. 이 추천 밖에서 따로 관리하는 재료 목록과 함께 담은 장바구니는 별도예요.</p><button type="button" disabled={progress.busy} onClick={()=>setConfirmReset(false)}>취소</button><button type="button" disabled={progress.busy||!progress.ready} onClick={()=>void resetCart()}>{progress.busy?'초기화 중…':'확인, 모두 초기화'}</button></div>}
  </section>}
  {mode==='plan'&&ids.length>0&&<div className="home-steps"><span>💰 예산 정하기</span><span>→</span><strong>🍚 메뉴 고르기</strong><span>→</span><span>✓ 먹었어요</span></div>}
  {mode==='plan'&&!locale.isTaiwan&&ids.length>0&&<section className={adoptionStyles.card} aria-label="선택한 식단으로 기록 시작하기">
   <span>🌱 {shoppingGoals[conditions.goal??'maintain'].label} · {ids.length}끼</span>
   <h3>마음에 드는 메뉴로, 이대로 먹어볼까요?</h3>
   <p>아래에서 메뉴를 바꿔 고른 뒤 저장하세요. {userId?'내 계정에서 식단을 이어 보고 기록할 수 있어요.':'로그인하면 고른 식단을 계정에 저장하고, 매일의 식비와 영양을 모아 볼 수 있어요.'}</p>
   <div className={adoptionStyles.benefits}><span>🧺 나의 장보기</span><span>💰 월별 식비</span><span>🥚 칼로리·단백질 등 영양 기록</span></div>
   <button type="button" className="primary-button" disabled={busy||loading||total>conditions.budget} onClick={()=>void save()}>{busy?'저장 중…':userId?'이대로 먹기 · 식단 저장':'이대로 먹기 · 로그인하고 저장'}</button>
   {userId&&<div><Link href="/cart">장보기 이어가기 →</Link><Link href="/record">내 식비·영양 기록 →</Link></div>}
   <small>추천·저장만으로 지출이나 먹은 기록이 생기지는 않아요. 구매 상태와 실제 먹은 양을 등록하면 기록에 반영돼요. 영양은 등록·추정 정보 기준이며 미확인 값은 제외해요.</small>
  </section>}
  {mode==='plan'&&ids.length>0&&<TodayMeals nutritionReference={personalization?.nutritionReference??null} shoppingTotal={purchases.reduce((sum,row)=>sum+row.cost,0)} intake={intake} userId={userId} onLogin={onLogin} ids={ids} products={products} conditions={conditions} startDate={conditions.startDate??locale.today()} onStartDate={date=>{const c=parseConditions({...conditions,startDate:date});if(c){setConditions(c);remember(c,ids);}}} onSwap={swap} onChoose={chooseMeal} progress={progress} perMealCalories={personalization?.perMealCalories??null} dailyCalories={personalization?.blocked?null:personalization?.dailyCalories??null} dashboard={dashboard}/>}
  {mode!=='settings'&&ids.length>1&&new Set(ids).size===1&&<p className="body-note" role="status">현재 조건에서는 한 가지 메뉴로만 구성됐어요. 예산·조리 방식·제외 재료 설정을 확인해 주세요. 다른 메뉴를 원하면 조건을 조정하고 다시 추천받아 주세요.</p>}
  {!locale.isTaiwan&&mode!=='settings'&&ids.length>0&&<details className="home-secondary"><summary>이 식단 공유하기</summary><SharePlanButton key={JSON.stringify([ids,conditions.days,conditions.slots])} userId={userId} onLogin={onLogin} conditions={conditions} mealIds={ids}/></details>}
  {!locale.isTaiwan&&mode!=='settings'&&ids.length>0&&<p className="body-note">음식 종류 · {conditions.mealKinds?.length?conditions.mealKinds.map(k=>mealKinds[k].label).join('·'):'골고루'} / 식사 목표 · {shoppingGoals[conditions.goal??'maintain'].label}</p>}
  {mode==='plan'&&ids.length>0&&<div className="planner-reroll-actions">
   <button type="button" className="primary-button" disabled={busy||loading||progress.busy||!progress.ready} onClick={()=>void generate(conditions)}>🔀 다른 조합으로 다시 추천</button>
   <button type="button" className="planner-restart" disabled={busy||progress.busy} onClick={returnToSetup}><span aria-hidden="true">⚙️</span> 조건 바꿔서 다시 추천받기</button>
  </div>}
  {(mode!=='plan'||!ids.length)&&<details ref={setupRef} tabIndex={-1} className="planner-controls" open={mode==='settings'||mode==='plan'}><summary>{ids.length?'예산·취향 바꿔서 새로 추천받기':'내 예산으로 식단 준비하기'}</summary>
  <div className="planner-heading">{mode==='plan'&&<div className="planner-buddy" aria-hidden="true"><RiceBuddy/><span>잘 챙겨 먹자!</span></div>}<span>예산에 맞는 장보기</span><h2 id="planner-title">{mode==='settings'?'내 장보기 설정':mode==='cart'?'이번에 살 것':'이번 주, 뭐 먹을까요?'}</h2><p>{mode==='settings'?'자주 쓰는 예산과 식사 취향을 저장해 두세요. 다음 추천부터 다시 입력할 필요 없어요.':ultra?'예산만 고르면 바로 살 만한 메뉴를 추천해 드려요.':'예산을 먼저 정하고 인원과 끼니를 고르면, 살 만한 메뉴를 추천해요.'}</p></div>
  {progress.error&&!ids.length&&mode!=='cart'&&<p role="alert">{progress.error} <button type="button" onClick={progress.reload}>구매 상태 다시 불러오기</button></p>}
  {mode!=='cart'&&<form className="planner-form" onSubmit={e=>{e.preventDefault();if(waitingForBudget)return;if(mode==='settings')void savePreferences();else void generate();}}>
   <label className="planner-budget-input"><span>{simple&&<span className="planner-step">1</span>} {locale.isTaiwan?'장보기 예산':`${conditions.people??1}명 전체 장보기 예산`}</span> <small>배송비 제외</small><input type="number" min={locale.isTaiwan?10:1000} max={locale.isTaiwan?10000:1000000} step={1} required value={conditions.budget/(locale.isTaiwan?100:1)||''} onChange={e=>update({budget:Math.round(Number(e.target.value)*(locale.isTaiwan?100:1))})}/></label>
   {mode==='plan'&&!locale.isTaiwan&&<div className="planner-mode" role="group" aria-label="추천 설정 모드"><button type="button" aria-pressed={formMode==='ultra'} onClick={()=>setFormMode('ultra')}>초간단</button><button type="button" aria-pressed={formMode==='simple'} onClick={()=>setFormMode('simple')}>간단 모드</button><button type="button" aria-pressed={formMode==='detailed'} onClick={()=>setFormMode('detailed')}>상세 모드</button></div>}
   {ultra&&<ShoppingGoalPicker value={conditions.goal} onChange={goal=>updatePreferences({goal})} settings={false} disabled={loading||busy}/>}
   {ultra&&<fieldset className="planner-ultra-presets" disabled={loading||busy||!progress.ready}>
    <legend>👇 예산만 골라도 바로 추천해요</legend>
    <div>{([['알뜰',0.7],['보통',1],['넉넉',1.3]] as [string,number][]).map(([label,ratio])=>{
     const base=suggestedBudget??50000;
     const amount=Math.min(1000000,Math.max(1000,Math.round(base*ratio/1000)*1000));
     return <button type="button" key={label} onClick={()=>{const c={...conditions,budget:amount};update({budget:amount});void generate(c);}}><strong>{label}</strong><span>{won(amount)}</span></button>;
    })}</div>
    <small>{conditions.meals}끼 · {(conditions.slots??['dinner']).map(s=>slotLabels[s]).join('·')} 기본 설정으로 바로 추천해요. 끼니 수나 취향은 결과 화면에서 조건을 바꿔 다시 추천받을 수 있어요.</small>
    <button type="button" className="text-link" onClick={()=>setFormMode('simple')}>직접 설정하고 싶어요 →</button>
   </fieldset>}
   {detailedView&&!locale.isTaiwan&&<fieldset className="planner-budget-presets"><legend>💰 장보기 예산을 더하고 빼세요</legend>{([1,-1] as const).map(direction=><div key={direction} className={direction===-1?'planner-budget-adjust':undefined} role="group" aria-label={direction===1?'예산 더하기':'예산 빼기'}>{[100000,50000,10000,1000].map(amount=><button key={amount} type="button" disabled={loading||busy||(direction===1?conditions.budget>=1000000:conditions.budget<=1000)} onClick={()=>update({budget:Math.min(1000000,Math.max(1000,conditions.budget+direction*amount))})}>{direction===1?'+':'−'}{amount===1000?'1천':amount/10000+'만'} 원</button>)}</div>)}<small>누를 때마다 현재 예산에 금액을 더하거나 빼요. 1천~100만 원까지 조절하거나 위 입력칸에 직접 입력하세요.</small></fieldset>}
   {!locale.isTaiwan&&!ultra&&<fieldset className="household-options" disabled={loading||busy}><legend>👥 몇 명이 먹나요?</legend><div>{[1,2,3,4].map(people=><button type="button" key={people} aria-pressed={(conditions.people??1)===people} onClick={()=>update({people})}>{people}명</button>)}</div><small>장보기는 {(conditions.people??1)}명 전체 분량, 영양·먹은 기록은 내 1인분 기준이에요.</small></fieldset>}
   {simple&&<fieldset className="planner-simple" disabled={loading||busy}><legend><span className="planner-step">2</span> 몇 끼 준비할까요?</legend><div>{[3,5,7].map(n=><button type="button" key={n} aria-pressed={!customMeals&&conditions.meals===n} onClick={()=>{setCustomMeals(false);update({mealCountMode:true,meals:n,days:Math.ceil(n/(conditions.slots?.length??1)),slots:conditions.slots??['dinner']});}}><span className="meal-preset-emoji" aria-hidden="true">{n===3?'🍙':n===5?'🍱':'🧺'}</span><strong>{n}끼</strong></button>)}<button type="button" aria-pressed={customMeals||![3,5,7].includes(conditions.meals)} onClick={()=>setCustomMeals(true)}><span className="meal-preset-emoji" aria-hidden="true">✏️</span><strong>직접 입력</strong></button></div>
   {(customMeals||![3,5,7].includes(conditions.meals))&&<label className="planner-meals-custom">끼니 수 직접 입력 <span>1~{MAX_PLAN_DAYS*(conditions.slots?.length??1)}끼</span><input type="number" min={1} max={MAX_PLAN_DAYS*(conditions.slots?.length??1)} step={1} inputMode="numeric" value={conditions.meals} onChange={e=>{const max=MAX_PLAN_DAYS*(conditions.slots?.length??1);const n=Math.max(1,Math.min(max,Math.round(Number(e.target.value))||1));update({mealCountMode:true,meals:n,days:Math.ceil(n/(conditions.slots?.length??1)),slots:conditions.slots??['dinner']});}}/></label>}
   <div className="simple-meal-times" role="group" aria-label="추천받을 끼니"><span>어느 끼니를 챙길까요?</span>{(['breakfast','lunch','dinner'] as MealSlot[]).map(slot=><button type="button" key={slot} aria-pressed={(conditions.slots??['dinner']).includes(slot)} onClick={()=>{const current=conditions.slots??['dinner'];const slots=current.includes(slot)?current.filter(s=>s!==slot):[...current,slot].sort((a,b)=>Object.keys(slotLabels).indexOf(a)-Object.keys(slotLabels).indexOf(b));if(slots.length){const meals=Math.min(conditions.meals,MAX_PLAN_DAYS*slots.length);update({mealCountMode:true,meals,days:Math.ceil(meals/slots.length),slots});}}}><span aria-hidden="true">{slot==='breakfast'?'☀️':slot==='lunch'?'🌤️':'🌙'}</span> {slotLabels[slot]}</button>)}</div><small>총 {conditions.meals}끼 · {(conditions.slots??['dinner']).map(s=>slotLabels[s]).join('·')} 순서로 {conditions.days??conditions.meals}일 동안 준비해요.{conditions.meals%(conditions.slots?.length??1)!==0?' 마지막 날은 선택한 끼니 일부만 포함돼요.':''}</small><MealModePicker conditions={conditions} simple disabled={loading||busy} onChange={update}/></fieldset>}
   {simple&&conditions.mealMode==='cook'&&<p className="body-note">🍳 불고기·삼겹살·두부·달걀 등 등록된 한식 요리에서 골라요. 현재 {conditions.meals}끼를 선택했어요. 더 많은 메뉴를 보려면 위에서 5끼·7끼를 선택하세요. 구매 재료 수는 메뉴에 따라 달라져요.</p>}
   {simple&&<><ShoppingGoalPicker value={conditions.goal} onChange={goal=>updatePreferences({goal})} settings={false} disabled={loading||busy}/><MealKindPicker value={conditions.mealKinds} onChange={updateMealKinds} disabled={loading||busy}/></>}
   {detailedView&&<>
   {!locale.isTaiwan&&<MealModePicker conditions={conditions} disabled={loading||busy} onChange={update}/>}
   {!locale.isTaiwan&&<MealKindPicker value={conditions.mealKinds} onChange={updateMealKinds} disabled={loading||busy}/>}
   {!locale.isTaiwan&&<><BudgetModePicker value={conditions.budgetMode} onChange={budgetMode=>updatePreferences({budgetMode})} disabled={loading||busy}/><ShoppingGoalPicker value={conditions.goal} onChange={goal=>updatePreferences({goal})} settings={mode==='settings'} disabled={loading||busy}/></>}
   <label>며칠을 준비할까요?<select value={conditions.days??5} onChange={e=>update({mealCountMode:false,days:Number(e.target.value),slots:conditions.slots??['dinner']})}>{Array.from({length:MAX_PLAN_DAYS},(_,i)=>i+1).map(days=><option key={days} value={days}>{days}일</option>)}</select></label>
   <fieldset className="planner-slots"><legend>앱이 챙겨줄 끼니</legend>{(Object.keys(slotLabels) as MealSlot[]).filter(slot=>!locale.isTaiwan||slot!=='breakfast').map(slot=><label key={slot}><Checkbox checked={(conditions.slots??['dinner']).includes(slot)} onChange={e=>{const current=conditions.slots??['dinner'];update({mealCountMode:false,days:conditions.days??5,slots:e.target.checked?[...current,slot].sort((a,b)=>Object.keys(slotLabels).indexOf(a)-Object.keys(slotLabels).indexOf(b)):current.filter(s=>s!==slot)});}}/>{slotLabels[slot]}</label>)}</fieldset>
   <small>밖에서 먹는 끼니는 선택하지 마세요. 아침은 아침용 상품이 등록된 경우에만 추천해요.</small>
   </>}
   {!locale.isTaiwan&&!ultra&&conditions.mealMode!=='ready'&&<fieldset className="household-options" disabled={loading||busy}><legend>🍽️ 어떻게 차릴까요?</legend><div>{[0,1,2].map(sideCount=><button type="button" key={sideCount} aria-pressed={(conditions.sideCount??0)===sideCount} onClick={()=>update({sideCount})}>{sideCount===0?'한 그릇':`메인 + 반찬 ${sideCount}개`}</button>)}</div><small>직접 요리하는 끼니에 적용해요. 반찬 재료비·영양도 포함하며, 한 그릇은 추가 반찬 없이 준비해요.</small></fieldset>}
   {detailedView&&!locale.isTaiwan&&<div className="planner-budget-start" aria-live="polite"><span>🌱 처음이라면 이 정도로 시작해요</span>{loading||budgetPending?<p>선택한 기간과 끼니에 맞춰 예산을 계산하고 있어요.</p>:suggestedBudget!==null?<><strong>{conditions.days??Math.ceil(conditions.meals/(conditions.slots?.length??1))}일 · {conditions.meals}끼, 약 {won(suggestedBudget)}</strong><small>현재 상품으로 중복 없는 장보기 구성 기준 · 배송비 별도</small><button type="button" disabled={loading||busy} onClick={()=>{update({budget:suggestedBudget});setAutomaticBudget(true);}}>{automaticBudget?'추천 예산 적용 중 ✓':'이 예산으로 시작하기'}</button><small>{automaticBudget?'기간·끼니를 바꾸면 예산도 맞춰 드려요. 금액을 직접 입력하면 유지해요.':'직접 입력하거나 저장한 예산은 그대로 유지해요.'}</small></>:<p>현재 조건으로 예산을 계산하기 어려워요. 끼니나 조리 방식을 확인해 주세요.</p>}</div>}
   {detailedView&&!locale.isTaiwan&&<p className="body-note">적용 중: {budgetModes[conditions.budgetMode??'balanced'].label} · {conditions.mealKinds?.length?conditions.mealKinds.map(k=>mealKinds[k].label).join('·'):'음식 종류 골고루'} · {shoppingGoals[conditions.goal??'maintain'].label} · {conditions.mealMode==='cook'?'직접 요리':conditions.mealMode==='ready'?'간편식':'간편식·직접 요리'} · 제외 재료 {(conditions.excluded??[]).length}개{conditions.avoid.trim()?' · 직접 입력 있음':''}</p>}
   {detailedView&&<details className="planner-more-options" open={moreOptions} onToggle={e=>setMoreOptions(e.currentTarget.open)}><summary>{locale.isTaiwan?'更多設定・預算與排除食材':'더보기 · 예산 가이드·조리 방식'}</summary>
  {personalization&&<details className="planner-profile-summary"><summary>내 정보 반영 내용</summary><div className="meal-notice">{personalization.blocked?<p>현재 신체 정보에서는 자동 맞춤 추천을 제공하지 않아요.</p>:personalization.hasProfile?<><strong>내 정보 기준 · 하루 유지 필요량 약 {personalization.dailyCalories?.toLocaleString()} kcal</strong><p>하루 {personalization.meals}끼 기준 한 끼 약 {personalization.perMealCalories} kcal와 가까운 상품을 우선해요. 선택한 끼니만 추천하며 하루 전체 영양을 충족하는 식단은 아니에요.</p><small>{personalization.nutritionMatched?`등록 영양값을 비교할 수 있는 상품 ${personalization.nutritionMatched}개`:'현재 상품은 영양 정보가 부족해 열량 기준의 비교가 어려워요. 등록된 기준량과 1회분 중량이 있어야 영양값을 비교할 수 있어요.'}</small></>:<p><Link href="/profile#profile-settings">신체 정보를 입력하면 내 필요 열량을 기준으로 추천받을 수 있어요 →</Link></p>}{personalization.style&&<p>식단 취향: {personalization.style} · 제외 재료: {(conditions.excluded??[]).map(key=>excludedFoods[key]).join(', ')||'없음'}</p>}</div></details>}

   {!loading&&progress.ready&&<div className="planner-budget-hint" aria-live="polite">
    <strong>💰 {conditions.days??schedule.at(-1)?.day}일 · {conditions.meals}끼를 준비해요</strong>
    <p>지금 예산은 1인분 한 끼당 약 {won(Math.round(conditions.budget/Math.max(1,conditions.meals*(conditions.people??1))))}이에요.</p>
    {!budgetGuide?<p>{budgetPending?'선택한 기간에 맞는 예산을 계산하고 있어요.':'예산 가이드를 계산하지 못했어요. 조건을 바꿔 다시 확인해 주세요.'}</p>:budgetGuide.minimum===null?<p>선택한 끼니에 맞는 상품이 부족해 예산을 계산하기 어려워요.</p>:<>
     <p>현재 상품으로 {budgetGuide.approximate?'찾은 절약 구성':'가장 저렴한 구성'}은 약 <b>{won(budgetGuide.minimum)}</b>{budgetGuide.varietyMinimum!==null&&budgetGuide.count>1?<> · 다른 메뉴로 구성하면 약 <b>{won(budgetGuide.varietyMinimum)}</b>부터예요.</>:'부터예요. 같은 메뉴는 중복하지 않아요.'}</p>
     <div className="planner-presets">{[...new Set([budgetGuide.minimum,budgetGuide.varietyUpper].filter((n):n is number=>n!==null).map(n=>Math.max(1000,Math.ceil(n/1000)*1000)))].filter(n=>n<=1000000).map(n=><button type="button" key={n} aria-pressed={conditions.budget===n} onClick={()=>update({budget:n})}>{won(n)}으로 맞추기</button>)}</div>
    </>}
    <small>확인 시점의 상품 가격으로 계산한 예상 금액이에요. 가격·할인·옵션에 따라 달라질 수 있으며 배송비는 별도예요.</small>
   </div>}
   {!loading&&progress.ready&&budgetGuide&&<details className="planner-budget-guide" open={budgetGuide.minimum===null||conditions.budget<budgetGuide.minimum}><summary>내 예산으로 얼마나 준비할 수 있나요?</summary>
    <strong>{conditions.days??schedule.at(-1)?.day}일 · {conditions.meals}끼 예산 가이드</strong>
    <p>현재 추천 후보 {budgetGuide.count}종 · {budgetGuide.options.map(o=>`${slotLabels[o.slot]} ${o.count}종`).join(' / ')}</p>
    {budgetGuide.minimum===null?<p>선택한 끼니를 채울 상품이 부족해요. 조리 방식·끼니·제외 재료를 확인해 주세요.</p>:<>
     <p>{budgetGuide.approximate?'찾은 절약 구성':'최저 구매 금액'} <b>{won(budgetGuide.minimum)}</b> <small>{budgetGuide.approximate?'탐색 결과 · 최저가 보장 아님':'중복 없는 구성'}</small></p>
     {budgetGuide.count>1&&budgetGuide.varietyMinimum!==null?<p>중복 없는 구성 <b>{won(budgetGuide.varietyMinimum)}{budgetGuide.varietyUpper!==budgetGuide.varietyMinimum?` ~ ${won(budgetGuide.varietyUpper!)}`:''}</b></p>:conditions.meals>1?<p role="status">후보가 한 가지뿐이라 예산을 올려도 메뉴가 다양해지지 않아요.</p>:null}
     {conditions.budget<budgetGuide.minimum&&<p role="status">{budgetGuide.approximate?'이 절약 구성은 현재 예산보다':'현재 예산에서'} {won(budgetGuide.minimum-conditions.budget)} {budgetGuide.approximate?'더 들어요':'더 필요해요' }.</p>}
     <div className="planner-presets">{[...new Set([budgetGuide.minimum,budgetGuide.varietyMinimum,budgetGuide.varietyUpper].filter((n):n is number=>n!==null).map(n=>Math.max(1000,Math.ceil(n/1000)*1000)))].filter(n=>n<=1000000).map(n=><button type="button" key={n} aria-pressed={conditions.budget===n} onClick={()=>update({budget:n})}>{won(n)}으로 설정</button>)}</div>
    </>}
    <small>확인 시점의 판매 묶음 가격과 주문·보유 수량 기준 · 가격 변동 가능 · 배송비 별도. 최소 금액은 영양 목표를 충족하는 금액이 아니에요.</small>
    <a href="#planner-exclusions" onClick={()=>{setMoreOptions(true);setShowExclusions(true);}}>피할 재료 상세 확인 ↓</a>
   </details>}
   {!locale.isTaiwan&&<details className="planner-more-options"><summary>먹는 방식·조리 설정</summary>
   <small>직접 요리는 판매 구성이 확인된 재료로 추천해요. 한 끼 재료비와 실제 구매할 묶음 금액을 따로 계산해요.</small>
   {conditions.mealMode!=='cook'&&<label>간편식 조리 방식<select value={conditions.cooking} onChange={e=>update({cooking:e.target.value as PlanConditions['cooking']})}><option value="all">간편식과 밀키트 골고루</option><option value="quick">데우거나 볶는 간편식 위주</option><option value="kit">밀키트 조리 가능</option></select></label>}
   </details>}
   </details>}
   <div id="planner-exclusions">
   {mode==='plan'&&<div className="planner-exclusions-toggle"><div><strong>못 먹는 재료가 있나요?</strong><small>{(conditions.excluded??[]).length?`${conditions.excluded!.length}개 재료 제외 중`:'알레르기·피하고 싶은 재료를 골라 주세요'}{conditions.avoid.trim()?' · 직접 입력 있음':''}</small></div><button type="button" aria-expanded={showExclusions} aria-controls="planner-exclusions-fields" onClick={()=>setShowExclusions(value=>!value)}>{showExclusions?'접기':'상세'}</button></div>}
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
   {!!conditions.swapPreferences?.length&&<p className="body-note">교체 의견 {conditions.swapPreferences.length}개 반영 중 <button type="button" disabled={busy} onClick={()=>updatePreferences({swapPreferences:[]})}>의견 초기화</button></p>}
   <button className="primary-button" disabled={loading||busy||waitingForBudget||!progress.ready||(mode!=='settings'&&!products.length)}>{loading?'설정 불러오는 중…':waitingForBudget?'예산 계산 중…':busy?(mode==='settings'?'저장 중…':'추천 준비 중…'):mode==='settings'?'저장하고 내 정보로 추천받기':'내 예산으로 추천받기 →'}</button>
  </form>}
  </details>}
  {mode!=='settings'&&!loading&&!products.length&&<p>현재 추천할 수 있는 상품이 없어요. 판매 구성과 출처가 확인된 상품을 준비하고 있어요.</p>}
  {error&&<p className="auth-error" role="alert">{error}</p>}
  {mode!=='settings'&&!loading&&!products.length&&<button type="button" onClick={()=>{setLoading(true);setRetry(n=>n+1);}}>상품 다시 불러오기</button>}
  {!locale.isTaiwan&&mode!=='settings'&&userId&&<button type="button" className="text-link" disabled={loading||busy||!progress.ready} onClick={restore}>저장한 식단 불러오기 →</button>}
  {!locale.isTaiwan&&ids.length>0&&<PlanPurchaseSummary rows={purchases} budget={conditions.budget} money={won}/>}
  {!locale.isTaiwan&&mode!=='settings'&&!!ids.length&&<CookingShoppingGuide ids={ids} products={products} conditions={conditions} onOwn={own} disabled={busy||progress.busy}/>}
  {!!ids.length&&<details className="planner-result" open={mode!=='plan'}><summary>준비한 식단 전체 · 구매 목록 ({ids.length}끼)</summary>
   {hasRecipes&&<section className="recipe-plan-list" aria-label="함께 준비하는 상품"><h3>🍳 이렇게 준비해요</h3><RecipePurchaseNote ids={ids} products={products} conditions={conditions}/>{ids.map((id,i)=>{const p=products.find(p=>p.id===id)!;return p.recipe?<article key={i}><small>{schedule[i].day}일차 · {slotLabels[schedule[i].slot]}</small><div><MealSourceBadge product={p}/></div><h4>{p.name}</h4><strong>한 끼 재료비 약 {won(p.price)}</strong><RecipeProductPreview product={p}/><MealComparison key={p.id.split('--with--')[0]} product={p} index={i} ids={ids} products={products} conditions={conditions} onChoose={chooseMeal} disabled={busy||progress.busy}/></article>:null;})}</section>}
   <ShoppingProgress guest={locale.isTaiwan||!userId} progress={progress} recommended
    summary={<div className="planner-total"><span>남은 식단 추가 구매 예상금액</span><strong>{won(total)}</strong><small>{total<=conditions.budget?`예산에서 ${won(conditions.budget-total)} 남아요`:`예산을 ${won(total-conditions.budget)} 초과했어요`} · 배송비 별도</small></div>}
    heading={<><h3>{hasRecipes?'함께 준비할 상품·재료':'이렇게 먹어요'}</h3><p className="body-note">추천 메뉴에서 살 것을 바로 선택하세요. 같은 메뉴라도 먹는 날은 따로 표시해요. 구매할 수량은 카드 아래에 한 번에 모았어요. 1회분 가격은 등록 판매가를 나눈 금액이며 실제 구매는 판매 묶음 단위예요.</p></>}
    items={rows.map(r=>({id:r.product.id,name:r.product.name,unit:'묶음',required:r.required,packSize:1,url:r.product.productUrl,price:r.product.price,detail:r.uses?`${r.product.detail} · 전체 ${r.uses}회분 · 앞으로 ${remaining[r.product.id]??0}회분`:`${r.product.detail} · 필요한 양 ${ingredientAmount(r.product,r.required)} · 식단 준비 후 남는 양 ${ingredientAmount(r.product,r.left)}`,
     thumbnail:<ProductThumb item={r.product}/>,
     recommendation:r.uses>0?<div className="planner-recommendation">
      {!locale.isTaiwan&&<p className="recommendation-reasons">{recommendationReasons(r.product,conditions,personalization?.perMealCalories??null).join(' · ')}</p>}
      <div className="planner-price-line"><b className="planner-meal-price">한 끼 {r.product.servings>1?'약 ':''}{won(Math.round(r.product.price/r.product.servings))}</b><span>판매 1묶음 {won(r.product.price)} · {r.product.servings}회분</span></div>
      <small className="planner-nutrition-note">{(()=>{const n=servingNutrients(r.product);const show=(v:number|null,unit:string)=>v===null?'미확인':`${Math.round(v*10)/10}${unit}`;return `${nutritionIsEstimated(r.product)?'추정 포함':'등록 영양정보'} · 1회분 ${show(n.calories,' kcal')} · 단백질 ${show(n.protein,'g')} · 탄수화물 ${show(n.carbs,'g')} · 지방 ${show(n.fat,'g')} · 나트륨 ${show(n.sodium,'mg')}${personalization?.perMealCalories?` · 내 한 끼 참고량 ${personalization.perMealCalories} kcal`:''}`;})()}</small>
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
  {mode==='cart'&&!ids.length&&<ShoppingProgress guest={locale.isTaiwan||!userId} progress={progress} items={[]}/>}
  {!locale.isTaiwan&&mode!=='settings'&&!!ids.length&&<RecommendationFeedback key={JSON.stringify([ids,conditions.budget,conditions.meals])} conditions={conditions} mealNames={ids.map(id=>products.find(p=>p.id===id)?.name??'확인되지 않은 메뉴')} page={mode==='cart'?'/cart':'/'}/>}
  {mode!=='cart'&&!!ids.length&&<Link href="/cart">이번 장보기 목록 보러 가기 →</Link>}
  {mode==='cart'&&!ids.length&&<p><Link href="/">홈에서 이번에 살 것 추천받기 →</Link></p>}
  {mode==='settings'&&<div className="profile-shopping-links"><Link href="/">내 설정으로 추천받기 →</Link><Link href="/cart">이번 장보기 목록 →</Link>{!userId&&<small>로그인하면 설정을 계정에 저장할 수 있어요.</small>}</div>}
  {message&&<p role="status" className="body-note">{message}</p>}
 </section>);
}
