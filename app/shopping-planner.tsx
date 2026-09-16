'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProductThumb } from './product-thumb';
import { basket, basketTotal, validMealIds, slotCandidates, mealSchedule, slotLabels, initialConditions, parseConditions, recommendShopping, swapMeal, type MealSlot, type PlanConditions, type PlanProduct } from '../lib/shopping-plan';
import './shopping-planner.css';

const won=(n:number)=>`${n.toLocaleString('ko-KR')}원`;
const draftKey='kkiniplan-shopping-draft-v1';
export function ShoppingPlanner({userId,onLogin,mode='plan'}:{userId?:string;onLogin:()=>void;mode?:'plan'|'cart'}){
 const [products,setProducts]=useState<PlanProduct[]>([]),[conditions,setConditions]=useState<PlanConditions>(initialConditions);
 const [ids,setIds]=useState<string[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/shopping-plan',{cache:'no-store',signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);return d;}).then(d=>{
   setProducts(d.products);setError('');
   try{const draft=JSON.parse(sessionStorage.getItem(draftKey)??'null');const c=parseConditions(draft?.conditions);
    if(c){setConditions(c);if(Array.isArray(draft.mealIds)&&validMealIds(draft.mealIds,d.products,c)&&basketTotal(draft.mealIds,d.products,c.owned)<=c.budget)setIds(draft.mealIds);}
   }catch{/* An expired draft should not stop browsing. */}
  }).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[retry]);
 function remember(c:PlanConditions,mealIds:string[]){try{sessionStorage.setItem(draftKey,JSON.stringify({conditions:c,mealIds}));}catch{/* Saving to an account remains available. */}}
 function update(patch:Partial<PlanConditions>){const c={...conditions,...patch};if(c.slots&&c.days)c.meals=c.slots.length*c.days;setConditions(c);setIds([]);setMessage('');setError('');remember(c,[]);}
 function generate(){
  setMessage('');setError('');const c=parseConditions(conditions);
  if(!c){setError('챙길 끼니를 하나 이상 고르고 예산을 1,000~1,000,000원으로 입력해 주세요.');return;}
  const missing=mealSchedule(c).find((_,i)=>!slotCandidates(products,c,i).length);
  if(missing){setError(`${slotLabels[missing.slot]}에 맞는 등록 상품이 부족해요. 해당 끼니를 빼거나 조리 방식·제외 재료를 조정해 주세요.`);return;}
  const next=recommendShopping(products,c);
  if(!next){setIds([]);remember(c,[]);setError('현재 등록 상품으로는 조건에 맞는 식단을 채울 수 없어요. 예산·끼니 수·조리 방식을 조정해 주세요.');return;}
  setIds(next);remember(c,next);
 }
 function swap(index:number){const next=swapMeal(ids,index,products,conditions);if(!next){setMessage('예산과 제외 재료 조건에 맞는 다른 메뉴가 없어요.');return;}setIds(next);remember(conditions,next);setMessage('메뉴와 구매 수량을 함께 바꿨어요.');}
 function own(id:string){const c={...conditions,owned:conditions.owned.includes(id)?conditions.owned.filter(x=>x!==id):[...conditions.owned,id]};setConditions(c);remember(c,ids);setMessage('');}
 async function save(){
  remember(conditions,ids);if(!userId){onLogin();return;}
  setBusy(true);setError('');setMessage('');
  try{const r=await fetch('/api/shopping-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conditions,mealIds:ids})});const d=await r.json();if(!r.ok)throw new Error(d.error);setMessage('식단을 계정에 저장했어요. 다음에 ‘저장한 식단 불러오기’로 확인할 수 있어요.');}
  catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요.');}finally{setBusy(false);}
 }
 async function restore(){
  setBusy(true);setError('');setMessage('');
  try{const r=await fetch('/api/shopping-plan?saved=1',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);if(!d.plan){setMessage('아직 저장한 장보기 식단이 없어요.');return;}
   const c=parseConditions(d.plan.conditions);if(!c)throw new Error('저장된 조건을 읽을 수 없어요.');setConditions(c);
   const valid=Array.isArray(d.plan.mealIds)&&validMealIds(d.plan.mealIds,products,c)&&basketTotal(d.plan.mealIds,products,c.owned)<=c.budget;
   const next=valid?d.plan.mealIds:[];setIds(next);remember(c,next);setMessage(valid?'저장한 식단을 불러왔어요. 금액은 현재 등록 가격으로 계산했어요.':'상품 또는 가격이 바뀌었어요. 저장한 조건으로 다시 추천받아 주세요.');
  }catch(e){setError(e instanceof Error?e.message:'불러오지 못했어요.');}finally{setBusy(false);}
 }
 const schedule=mealSchedule(conditions);
 const rows=basket(ids,products,conditions.owned),total=rows.reduce((n,r)=>n+r.cost,0);
 return <section className="shopping-planner" aria-labelledby="planner-title">
  <div className="planner-heading"><span>이번 주, 뭐 사서 먹지?</span><h2 id="planner-title">{mode==='cart'?'이번 주 살 것':'내 예산으로 챙기는 일주일'}</h2><p>챙길 끼니만 고르면 냉동식품·간편식·밀키트로 구매 목록을 만들어요. 신체 정보 없이 시작할 수 있어요.</p></div>
  {mode==='plan'&&<form className="planner-form" onSubmit={e=>{e.preventDefault();generate();}}>
   <label>며칠을 준비할까요?<select value={conditions.days??5} onChange={e=>update({days:Number(e.target.value),slots:conditions.slots??['dinner']})}><option value={5}>평일 5일</option><option value={7}>일주일 7일</option></select></label>
   <fieldset className="planner-slots"><legend>앱이 챙겨줄 끼니</legend>{(Object.keys(slotLabels) as MealSlot[]).map(slot=><label key={slot}><input type="checkbox" checked={(conditions.slots??['dinner']).includes(slot)} onChange={e=>{const current=conditions.slots??['dinner'];update({days:conditions.days??5,slots:e.target.checked?[...current,slot].sort((a,b)=>Object.keys(slotLabels).indexOf(a)-Object.keys(slotLabels).indexOf(b)):current.filter(s=>s!==slot)});}}/>{slotLabels[slot]}</label>)}</fieldset>
   <small>밖에서 먹는 끼니는 선택하지 마세요. 아침은 아침용 상품이 등록된 경우에만 추천해요.</small>
   <label>이번 장보기 예산 (배송비 제외)<input type="number" min={1000} max={1000000} step={1} required value={conditions.budget||''} onChange={e=>update({budget:Number(e.target.value)})}/></label>
   <div className="planner-presets">{[30000,50000,70000].map(n=><button type="button" key={n} aria-pressed={conditions.budget===n} onClick={()=>update({budget:n})}>{won(n)}</button>)}</div>
   <label>조리 방식<select value={conditions.cooking} onChange={e=>update({cooking:e.target.value as PlanConditions['cooking']})}><option value="all">간편식과 밀키트 골고루</option><option value="quick">데우거나 볶는 간편식 위주</option><option value="kit">밀키트 조리 가능</option></select></label>
   <label>피할 재료 (선택)<input value={conditions.avoid} maxLength={200} placeholder="예: 새우, 우유 — 쉼표로 구분" onChange={e=>update({avoid:e.target.value})}/></label>
   <small>등록된 상품명·원문 알레르기 표시에서 찾아 제외해요. 알레르기가 있다면 구매 전 전체 원재료와 제조시설 표시를 확인해 주세요.</small>
   <button className="primary-button" disabled={loading||busy||!products.length}>{loading?'판매 상품 불러오는 중…':'이번 주 살 것 추천받기 →'}</button>
  </form>}
  {!loading&&!products.length&&<p>현재 추천할 수 있는 상품이 없어요. 판매 구성과 출처가 확인된 상품을 준비하고 있어요.</p>}
  {error&&<p className="auth-error" role="alert">{error}</p>}
  {!loading&&!products.length&&<button type="button" onClick={()=>{setLoading(true);setRetry(n=>n+1);}}>상품 다시 불러오기</button>}
  {userId&&<button type="button" className="text-link" disabled={loading||busy} onClick={restore}>저장한 식단 불러오기 →</button>}
  {!!ids.length&&<div className="planner-result">
   <div className="planner-total"><span>{ids.length}끼 장보기 예상금액</span><strong>{won(total)}</strong><small>{total<=conditions.budget?`예산에서 ${won(conditions.budget-total)} 남아요`:`예산을 ${won(total-conditions.budget)} 초과했어요`} · 배송비 별도</small></div>
   <details open={mode==='plan'}><summary>일주일 먹는 순서 · 개별 교체</summary><h3>이렇게 먹어요</h3><p className="body-note">밥·면 중심의 메뉴 구성 제안이에요. 조리 기기·시간은 상품 페이지를 확인하고, 식사량에 따라 양을 조절해 주세요.</p>
   <ol className="planner-meals">{ids.map((id,i)=>{const p=products.find(p=>p.id===id)!;return <li key={`${i}-${id}`}><ProductThumb item={p}/><div><small>{schedule[i].day}일차 · {slotLabels[schedule[i].slot]}</small><strong>{p.name}</strong><small>{p.servingNote} · 1회분 사용</small></div><button type="button" onClick={()=>swap(i)} aria-label={`${i+1}번째 끼니 다른 메뉴`}>교체</button></li>;})}</ol></details>
   <h3>살 것 {rows.filter(r=>!r.have).length}종 · 판매 묶음 기준</h3><p className="body-note">‘이미 있어요’는 이 식단에 필요한 수량을 모두 가지고 있을 때 선택하세요.</p>
   <div className="planner-basket">{rows.map(r=><article key={r.product.id}><div><strong>{r.product.name}</strong><span>{r.product.detail} × {r.packs}묶음</span><span>{r.uses}회분 사용 · 계획 후 {r.left}회분 남음</span><b>{r.have?'보유 수량 사용':won(r.cost)}</b></div><label><input type="checkbox" checked={r.have} onChange={()=>own(r.product.id)}/>이미 있어요</label><a href={r.product.productUrl!} target="_blank" rel="noopener noreferrer">판매처에서 구매하기 ↗</a></article>)}</div>
   <p className="body-note">등록 가격 기준이며 할인·옵션·배송비는 판매처에서 확인해 주세요. 남는 수량은 계획상 계산값이에요. 실제 구매·섭취 여부를 자동 기록하지 않아요.</p>
   <button type="button" className="primary-button" disabled={busy||total>conditions.budget} onClick={save}>{busy?'저장 중…':userId?'이 식단 저장하기':'로그인하고 이 식단 저장하기'}</button>
  </div>}
  {mode==='plan'&&!!ids.length&&<Link href="/cart">이번 주 구매 목록 보러 가기 →</Link>}
  {mode==='cart'&&!ids.length&&<p><Link href="/">홈에서 이번 주 살 것 추천받기 →</Link></p>}
  {message&&<p role="status" className="body-note">{message}</p>}
 </section>;
}
