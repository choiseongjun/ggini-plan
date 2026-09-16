'use client';

import { Checkbox } from "./components/checkbox";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type {personalizeProducts} from '../lib/shopping-personalization';
import { ProductThumb } from './product-thumb';
import { basket, basketTotal, validMealIds, slotCandidates, mealSchedule, slotLabels, initialConditions, parseConditions, recommendShopping, swapMeal, type MealSlot, type PlanConditions, type PlanProduct } from '../lib/shopping-plan';
import './shopping-planner.css';
import {ShoppingProgress,useShoppingProgress} from './shopping-progress';

const won=(n:number)=>`${n.toLocaleString('ko-KR')}원`;
export function ShoppingPlanner({userId,onLogin,mode='plan'}:{userId?:string;onLogin:()=>void;mode?:'plan'|'cart'|'settings'}){
 const draftKey=`kkiniplan-shopping-draft-v2-${userId??'guest'}`;
 const [personalization,setPersonalization]=useState<ReturnType<typeof personalizeProducts>['personalization']|null>(null);
 const progress=useShoppingProgress(userId,'products');
 const [products,setProducts]=useState<PlanProduct[]>([]),[baseConditions,setConditions]=useState<PlanConditions>(initialConditions);
 const conditions:PlanConditions={...baseConditions,supply:Object.fromEntries(Object.values(progress.stock).map(i=>[i.id,i.owned+i.ordered]))};
 const [ids,setIds]=useState<string[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/shopping-plan',{cache:'no-store',signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);return d;}).then(d=>{
   setProducts(d.products);setPersonalization(d.personalization);setError('');setIds([]);
   const saved=parseConditions(d.preferences);setConditions(saved??initialConditions);
   try{const draft=JSON.parse(localStorage.getItem(draftKey)??sessionStorage.getItem(draftKey)??'null');const c=parseConditions(draft?.conditions);
    if(c){setConditions(c);if(Array.isArray(draft.mealIds)&&validMealIds(draft.mealIds,d.products,c)&&basketTotal(draft.mealIds,d.products,c.owned,c.supply)<=c.budget)setIds(draft.mealIds);}
   }catch{/* An expired draft should not stop browsing. */}
  }).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[retry,draftKey]);
 function remember(c:PlanConditions,mealIds:string[]){try{localStorage.setItem(draftKey,JSON.stringify({conditions:c,mealIds}));}catch{/* Saving to an account remains available. */}}
 function update(patch:Partial<PlanConditions>){const c={...conditions,...patch};if(c.slots&&c.days)c.meals=c.slots.length*c.days;setConditions(c);setIds([]);setMessage('');setError('');if(mode!=='settings')remember(c,[]);}
 async function generate(input=conditions){
  setMessage('');setError('');if(!progress.ready){setError('구매 상태를 먼저 불러와 주세요.');return;}const c=parseConditions({...input,supply:conditions.supply});
  if(!c){setError('챙길 끼니를 하나 이상 고르고 예산을 1,000~1,000,000원으로 입력해 주세요.');return;}
  setBusy(true);setIds([]);remember(c,[]);
  try{
   const response=await fetch('/api/shopping-plan',{cache:'no-store'});
   const data=await response.json();if(!response.ok)throw new Error(data.error);
   const fresh=data.products as PlanProduct[];setProducts(fresh);setPersonalization(data.personalization);
   if(data.personalization?.blocked)throw new Error('현재 신체 정보에서는 자동 맞춤 추천을 제공하지 않아요. 마이페이지 안내를 확인해 주세요.');
   if(mode==='settings'&&!data.personalization?.hasProfile)throw new Error('먼저 위의 신체 정보를 저장해 주세요. 저장한 정보를 기준으로 추천할게요.');
   const missing=mealSchedule(c).find((_,i)=>!slotCandidates(fresh,c,i).length);
   if(missing)throw new Error(`${slotLabels[missing.slot]}에 맞는 등록 상품이 부족해요. 해당 끼니를 빼거나 조리 방식·제외 재료를 조정해 주세요.`);
   const next=recommendShopping(fresh,c);
   if(!next)throw new Error('현재 등록 상품으로는 조건에 맞는 식단을 채울 수 없어요. 예산·끼니 수·조리 방식을 조정해 주세요.');
   setIds(next);remember(c,next);setMessage('저장된 최신 내 정보와 장보기 조건으로 추천했어요. 아래 상품을 교체하거나 구매 목록을 확인하세요.');
  }catch(e){setError(e instanceof Error?e.message:'추천을 불러오지 못했어요.');}finally{setBusy(false);}
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
   localStorage.setItem(draftKey,JSON.stringify({conditions:clean,mealIds:[]}));
   setIds([]);await generate(clean);
  }catch(e){setError(e instanceof Error?e.message:'설정을 저장하지 못했어요.');}finally{setBusy(false);}
 }
 async function save(){
  remember(conditions,ids);if(!userId){onLogin();return;}
  setBusy(true);setError('');setMessage('');
  try{const r=await fetch('/api/shopping-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conditions,mealIds:ids})});const d=await r.json();if(!r.ok)throw new Error(d.error);setMessage('식단을 계정에 저장했어요. 다음에 ‘저장한 식단 불러오기’로 확인할 수 있어요.');}
  catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요.');}finally{setBusy(false);}
 }
 async function restore(){
  setBusy(true);setError('');setMessage('');
  try{const r=await fetch('/api/shopping-plan?saved=1',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);if(!d.plan){setMessage('아직 저장한 장보기 식단이 없어요.');return;}
   const c=parseConditions({...d.plan.conditions,supply:conditions.supply});if(!c)throw new Error('저장된 조건을 읽을 수 없어요.');setConditions(c);
   const valid=Array.isArray(d.plan.mealIds)&&validMealIds(d.plan.mealIds,products,c)&&basketTotal(d.plan.mealIds,products,c.owned,c.supply)<=c.budget;
   const next=valid?d.plan.mealIds:[];setIds(next);remember(c,next);setMessage(valid?'저장한 식단을 불러왔어요. 금액은 현재 등록 가격으로 계산했어요.':'상품 또는 가격이 바뀌었어요. 저장한 조건으로 다시 추천받아 주세요.');
  }catch(e){setError(e instanceof Error?e.message:'불러오지 못했어요.');}finally{setBusy(false);}
 }
 const schedule=mealSchedule(conditions);
 const rows=basket(ids,products,conditions.owned,conditions.supply),total=rows.reduce((n,r)=>n+r.cost,0);
 return <section id={mode==='settings'?'shopping-settings':undefined} className="shopping-planner" aria-labelledby="planner-title">
  <div className="planner-heading"><span>이번 주, 뭐 사서 먹지?</span><h2 id="planner-title">{mode==='settings'?'내 장보기 설정':mode==='cart'?'이번 주 살 것':'내 예산으로 챙기는 일주일'}</h2><p>{mode==='settings'?'자주 쓰는 예산과 식사 취향을 저장해 두세요. 다음 추천부터 다시 입력할 필요 없어요.':'챙길 끼니만 고르면 냉동식품·간편식·밀키트로 구매 목록을 만들어요. 저장된 신체 정보와 식단 취향도 함께 반영해요.'}</p></div>
  {personalization&&<div className="meal-notice">{personalization.blocked?<p>현재 신체 정보에서는 자동 맞춤 추천을 제공하지 않아요.</p>:personalization.hasProfile?<><strong>내 정보 기준 · 하루 유지 필요량 약 {personalization.dailyCalories?.toLocaleString()} kcal</strong><p>하루 {personalization.meals}끼 기준 한 끼 약 {personalization.perMealCalories} kcal와 가까운 상품을 우선해요. 선택한 끼니만 추천하며 하루 전체 영양을 충족하는 식단은 아니에요.</p><small>{personalization.nutritionMatched?`영양 표시를 비교할 수 있는 상품 ${personalization.nutritionMatched}개`:'현재 상품은 영양 정보가 부족해 열량 기준의 비교가 어려워요. 확인되지 않은 값은 추정하지 않아요.'}</small></>:<p><Link href="/profile#profile-settings">신체 정보를 입력하면 내 필요 열량을 기준으로 추천받을 수 있어요 →</Link></p>}{personalization.style&&<p>식단 취향: {personalization.style} · 제외 재료: {personalization.excluded.join(', ')||'없음'}</p>}</div>}
  {progress.error&&!ids.length&&mode!=='cart'&&<p role="alert">{progress.error} <button type="button" onClick={progress.reload}>구매 상태 다시 불러오기</button></p>}
  {mode!=='cart'&&<form className="planner-form" onSubmit={e=>{e.preventDefault();if(mode==='settings')void savePreferences();else void generate();}}>
   <label>며칠을 준비할까요?<select value={conditions.days??5} onChange={e=>update({days:Number(e.target.value),slots:conditions.slots??['dinner']})}><option value={5}>평일 5일</option><option value={7}>일주일 7일</option></select></label>
   <fieldset className="planner-slots"><legend>앱이 챙겨줄 끼니</legend>{(Object.keys(slotLabels) as MealSlot[]).map(slot=><label key={slot}><Checkbox checked={(conditions.slots??['dinner']).includes(slot)} onChange={e=>{const current=conditions.slots??['dinner'];update({days:conditions.days??5,slots:e.target.checked?[...current,slot].sort((a,b)=>Object.keys(slotLabels).indexOf(a)-Object.keys(slotLabels).indexOf(b)):current.filter(s=>s!==slot)});}}/>{slotLabels[slot]}</label>)}</fieldset>
   <small>밖에서 먹는 끼니는 선택하지 마세요. 아침은 아침용 상품이 등록된 경우에만 추천해요.</small>
   <label>이번 장보기 예산 (배송비 제외)<input type="number" min={1000} max={1000000} step={1} required value={conditions.budget||''} onChange={e=>update({budget:Number(e.target.value)})}/></label>
   <div className="planner-presets">{[30000,50000,70000].map(n=><button type="button" key={n} aria-pressed={conditions.budget===n} onClick={()=>update({budget:n})}>{won(n)}</button>)}</div>
   <label>조리 방식<select value={conditions.cooking} onChange={e=>update({cooking:e.target.value as PlanConditions['cooking']})}><option value="all">간편식과 밀키트 골고루</option><option value="quick">데우거나 볶는 간편식 위주</option><option value="kit">밀키트 조리 가능</option></select></label>
   <label>피할 재료 (선택)<input value={conditions.avoid} maxLength={200} placeholder="예: 새우, 우유 — 쉼표로 구분" onChange={e=>update({avoid:e.target.value})}/></label>
   <small>등록된 상품명·원문 알레르기 표시에서 찾아 제외해요. 알레르기가 있다면 구매 전 전체 원재료와 제조시설 표시를 확인해 주세요.</small>
   <button className="primary-button" disabled={loading||busy||!progress.ready||(mode!=='settings'&&!products.length)}>{loading?'설정 불러오는 중…':busy?'저장 중…':mode==='settings'?'저장하고 내 정보로 추천받기':'이번 주 살 것 추천받기 →'}</button>
  </form>}
  {mode!=='settings'&&!loading&&!products.length&&<p>현재 추천할 수 있는 상품이 없어요. 판매 구성과 출처가 확인된 상품을 준비하고 있어요.</p>}
  {error&&<p className="auth-error" role="alert">{error}</p>}
  {mode!=='settings'&&!loading&&!products.length&&<button type="button" onClick={()=>{setLoading(true);setRetry(n=>n+1);}}>상품 다시 불러오기</button>}
  {mode!=='settings'&&userId&&<button type="button" className="text-link" disabled={loading||busy||!progress.ready} onClick={restore}>저장한 식단 불러오기 →</button>}
  {!!ids.length&&<div className="planner-result">
   <div className="planner-total"><span>{ids.length}끼 추가 구매 예상금액</span><strong>{won(total)}</strong><small>{total<=conditions.budget?`예산에서 ${won(conditions.budget-total)} 남아요`:`예산을 ${won(total-conditions.budget)} 초과했어요`} · 배송비 별도</small></div>
   <details open={mode!=='cart'}><summary>일주일 먹는 순서 · 개별 교체</summary><h3>이렇게 먹어요</h3><p className="body-note">밥·면 중심의 메뉴 구성 제안이에요. 조리 기기·시간은 상품 페이지를 확인하고, 식사량에 따라 양을 조절해 주세요.</p>
   <ol className="planner-meals">{ids.map((id,i)=>{const p=products.find(p=>p.id===id)!;return <li key={`${i}-${id}`}><ProductThumb item={p}/><div><small>{schedule[i].day}일차 · {slotLabels[schedule[i].slot]}</small><strong>{p.name}</strong><small>{p.servingNote} · 1회분 사용</small><small>{p.servingCalories!=null?`표시 영양 기준 약 ${p.servingCalories} kcal/회분${personalization?.perMealCalories?` · 내 한 끼 참고량 ${personalization.perMealCalories} kcal`:''}`:'열량 미확인 · 예산과 확인된 식단 조건으로 추천'}</small></div><button type="button" onClick={()=>swap(i)} aria-label={`${i+1}번째 끼니 다른 메뉴`}>교체</button></li>;})}</ol></details>
   <ShoppingProgress guest={!userId} progress={progress} items={rows.map(r=>({id:r.product.id,name:r.product.name,unit:'묶음',required:r.have?0:r.packs,url:r.product.productUrl,price:r.product.price,detail:`${r.product.detail} · 식단에 ${r.uses}회분 필요`}))}/>
   {!!conditions.owned.length&&<details><summary>이전에 체크한 보유 상품</summary>{rows.filter(r=>r.have).map(r=><label key={r.product.id}><Checkbox checked onChange={()=>own(r.product.id)}/>{r.product.name} · 이미 있어요</label>)}</details>}
   <button type="button" className="primary-button" disabled={busy||total>conditions.budget} onClick={save}>{busy?'저장 중…':userId?'이 식단 저장하기':'로그인하고 이 식단 저장하기'}</button>
  </div>}
  {mode==='cart'&&!ids.length&&<ShoppingProgress guest={!userId} progress={progress} items={[]}/>}
  {mode!=='cart'&&!!ids.length&&<Link href="/cart">이번 주 구매 목록 보러 가기 →</Link>}
  {mode==='cart'&&!ids.length&&<p><Link href="/">홈에서 이번 주 살 것 추천받기 →</Link></p>}
  {mode==='settings'&&<div className="profile-shopping-links"><Link href="/">내 설정으로 추천받기 →</Link><Link href="/cart">이번 주 구매 목록 →</Link>{!userId&&<small>로그인하면 설정을 계정에 저장할 수 있어요.</small>}</div>}
  {message&&<p role="status" className="body-note">{message}</p>}
 </section>;
}
