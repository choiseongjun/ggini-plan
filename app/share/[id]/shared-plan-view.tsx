'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {AuthScreen} from '../../auth-screen';
import {SharedPlanDays} from '../../shared-plan-days';
import type {SharedPlan} from '../../../lib/shared-plan';
import {importGuestStock} from '../../../lib/guest-shopping-progress';
import '../../shared-plan.css';
const won=(n:number)=>`${Math.round(n).toLocaleString('ko-KR')}원`;
export function SharedPlanView({id}:{id:string}){
 const [plan,setPlan]=useState<SharedPlan|null>(null),[userId,setUserId]=useState<string>(),[authReady,setAuthReady]=useState(false),[auth,setAuth]=useState(false);
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[budget,setBudget]=useState(50000),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false),[revision,setRevision]=useState(0);
 const lock=useRef(false);
 useEffect(()=>{
  const c=new AbortController();
  fetch(`/api/shared-plans?id=${encodeURIComponent(id)}`,{signal:c.signal,cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);return d.plan as SharedPlan;}).then(p=>{setPlan(p);setBudget(Math.max(1000,Math.min(1000000,p.total)));setError('');}).catch(e=>{if(!c.signal.aborted)setError(e.message);});
  fetch('/api/auth/me',{signal:c.signal,cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error();return r.json();}).then(d=>setUserId(d.user?.id)).catch(()=>{}).finally(()=>{if(!c.signal.aborted)setAuthReady(true);});
  return()=>c.abort();
 },[id,revision]);
 async function adopt(){
  if(!userId){setAuth(true);return;}if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{
   await importGuestStock(userId);
   const r=await fetch('/api/shared-plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'adopt',id,budget})});const d=await r.json();
   if(!r.ok){if(r.status===401){setUserId(undefined);setAuth(true);}throw new Error(d.error);}
   localStorage.setItem(`kkiniplan-shopping-draft-v2-${d.userId}`,JSON.stringify({conditions:d.conditions,mealIds:d.mealIds,savedAt:Date.now()}));
   setSaved(true);setMessage(d.adjusted?'내 예산과 취향에 맞게 일부 메뉴를 다시 추천해 저장했어요. 홈에서 확인해 주세요.':'이 식단을 내 계정에 저장했어요. 오늘부터 홈에서 이어서 볼 수 있어요.');
  }catch(e){setError(e instanceof Error?e.message:'식단을 가져오지 못했어요.');}finally{lock.current=false;setBusy(false);}
 }
 return <main className="shared-plan-page"><Link className="shared-brand" href="/">🍚 끼니플랜</Link>{auth?<AuthScreen onExplore={()=>setAuth(false)} onSuccess={user=>{setUserId(user.id);setAuth(false);setMessage('로그인했어요. 예산을 확인하고 이 식단으로 시작해 보세요.');}}/>:<>
  <header><span>나누면 더 맛있는 한 끼 🥄</span><h1>같이 이렇게 먹어요</h1><p>친구가 골라둔 메뉴, 내 예산으로도 준비해 볼까요?</p></header>
  {error&&<p role="alert">{error}{!plan&&<button type="button" onClick={()=>setRevision(n=>n+1)}>다시 불러오기</button>}</p>}
  {!plan&&!error&&<p role="status">공유한 식단을 불러오는 중…</p>}
  {plan&&<>
   <section className="shared-total"><span>{plan.people??1}명 · {plan.days}일 · {plan.meals.length}끼 전체 구매 예상</span><strong>{won(plan.total)}</strong><p>공유 당시 판매 묶음 가격 기준 · 배송비 별도<br/>보유 재료 없이 모두 구매할 때의 금액이에요.</p></section>
   <section className="shared-adopt"><h2>내 식단으로 시작하기</h2><p>내 예산·제외 재료·보유 수량에 맞춰 가져와요. 조건에 맞지 않는 메뉴는 바뀔 수 있어요.</p><form onSubmit={e=>{e.preventDefault();void adopt();}}><label>내 장보기 예산<input type="number" required min={1000} max={1000000} step={1} value={budget||''} disabled={busy||saved} onChange={e=>setBudget(Number(e.target.value))}/></label><small>시작일은 오늘로 설정하고 현재 식단을 이 식단으로 바꿔요. 기존 구매·섭취 기록은 유지돼요.</small>{saved?<Link className="shared-primary" href="/">홈에서 내 식단 보기 →</Link>:<button className="shared-primary" disabled={!authReady||busy}>{busy?'내 조건으로 준비하는 중…':userId?'이 식단으로 시작하기':'로그인하고 이 식단으로 시작하기'}</button>}</form>{message&&<p role="status">{message}</p>}</section>
   <SharedPlanDays plan={plan}/>
   <details className="shared-packs"><summary>전체 구매 수량 보기</summary>{(plan.purchases??plan.products).map(p=><p key={p.id}>{p.name} · {p.packs}묶음 · {won(p.price*p.packs)}</p>)}</details>
   <p className="shared-note">공유할 때의 식단이에요. 현재 판매 가격·구성과 다를 수 있으며, 개인의 하루 전체 영양을 충족하는 식단은 아니에요.</p>
  </>}
 </>}</main>;
}
