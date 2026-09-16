'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {addDays} from '../lib/dashboard';
import {useEffect,useState} from 'react';
import type {DayPlan,ingredientBasket} from '../lib/monthly-plan';
import {shoppingSearchLinks} from '../lib/catalog';
import {ProductThumb} from './product-thumb';
import './monthly-planner.css';
type Items=ReturnType<typeof ingredientBasket>;
type Plan={days:DayPlan[];items:Items};
type Basket={month:string;start:string;end:string;owned:string[];items:Items};
const won=(n:number)=>`${n.toLocaleString('ko-KR')}원`;
const thisMonth=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,7);
function IngredientRows({items,onOwned,disabled=false}:{items:Items;onOwned?:(food:string)=>void;disabled?:boolean}){
 return <div className="ingredient-rows">{items.map(row=><article key={row.food}>
  <div className="ingredient-title">{row.product&&<ProductThumb item={row.product}/>}<div><strong>{row.name}</strong><span>필요량 {row.grams.toLocaleString('ko-KR')}g · 레시피의 조리 상태 기준</span></div></div>
  {row.product?<><a href={row.product.productUrl!} target="_blank" rel="noopener noreferrer">{row.product.name} ↗</a><p>{row.product.detail}{row.packs!==null?` × ${row.packs}개 · ${won(row.cost??0)}`:' · 구매 수량 확인 필요'}</p>{row.leftGrams!==null&&<small>판매 묶음 기준 {row.leftGrams.toLocaleString('ko-KR')}g 남을 예정</small>}</>:<><p>상품 연결 필요 · 가격 미확인</p><a href={shoppingSearchLinks(row.name)[0].url} target="_blank" rel="noopener noreferrer">판매 상품 직접 검색 ↗</a></>}
  {onOwned&&<label><input type="checkbox" checked={row.have} disabled={disabled} onChange={()=>onOwned(row.food)}/>필요한 양이 집에 있어요 · 구매에서 제외</label>}
 </article>)}</div>;
}
export function MonthlyPlanner({userId,onLogin,mode='calendar'}:{userId?:string;onLogin:()=>void;mode?:'calendar'|'cart'}){
 const [today]=useState(()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10));
 const weekly=usePathname()==='/calendar/week';
 const [month,setMonth]=useState(thisMonth),[plan,setPlan]=useState<Plan|null>(null),[cart,setCart]=useState<Basket|null>(null),[budget,setBudget]=useState<number|null>(null);
 const [date,setDate]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState(''),[revision,setRevision]=useState(0),[replace,setReplace]=useState(false);
 useEffect(()=>{
  if(!userId)return;
  const controller=new AbortController();
  fetch(mode==='cart'?'/api/monthly-plan?basket=1':`/api/monthly-plan?month=${month}`,{cache:'no-store',signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);
   if(mode==='calendar'&&!d.plan){
    const prepared=await fetch('/api/monthly-plan',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({month,action:'ensure'})});
    const result=await prepared.json();if(!prepared.ok)throw new Error(result.error);
    const refreshed=await fetch(`/api/monthly-plan?month=${month}`,{cache:'no-store',signal:controller.signal});const ready=await refreshed.json();if(!refreshed.ok)throw new Error(ready.error);return ready;
   }
   return d;}).then(d=>{
   if(mode==='cart')setCart(d.basket);else{setPlan(d.plan);setBudget(d.budget);setDate(current=>current.startsWith(month)?current:month===thisMonth()?new Date(Date.now()+9*3600000).toISOString().slice(0,10):`${month}-01`);}setError('');
  }).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[userId,month,mode,revision]);
 async function act(action:string,extra:Record<string,unknown>={}){
  if(!userId){onLogin();return;}setBusy(true);setError('');setMessage('');
  try{const r=await fetch('/api/monthly-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({month:mode==='cart'?cart?.month:month,action,...extra})});const d=await r.json();if(!r.ok)throw new Error(d.error);
   setRevision(n=>n+1);setReplace(false);setMessage(action==='basket'?'선택한 기간의 재료를 장보기 목록에 담았어요. 기존 목록은 이 기간으로 바뀌었어요.':action==='swap'?'이 끼니를 교체했어요. 장보기 수량도 다시 계산돼요.':action==='owned'?'보유 재료를 반영했어요.':'월간 식단을 저장했어요.');
  }catch(e){setError(e instanceof Error?e.message:'요청을 처리하지 못했어요.');}finally{setBusy(false);}
 }
 const chosen=plan?.days.find(d=>d.date===date),items=mode==='cart'?cart?.items:plan?.items;
 const total=items?.reduce((sum,r)=>sum+(r.cost??0),0)??0,unknown=items?.filter(r=>!r.have&&r.cost===null).length??0;
 const end=new Date(`${date||month+'-01'}T00:00:00Z`);end.setUTCDate(end.getUTCDate()+6);const last=new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate();
 const weekStart=addDays(date||month+'-01',-((new Date(`${date||month+'-01'}T00:00:00Z`).getUTCDay()+6)%7));
 const visibleDays=plan?.days.filter(d=>!weekly||(d.date>=weekStart&&d.date<addDays(weekStart,7)))??[];
 const rangeEnd=end.toISOString().slice(0,7)===month?end.toISOString().slice(0,10):`${month}-${last}`;
 return <section className={`monthly-planner ${weekly?'weekly-view':''}`} aria-label={mode==='cart'?'식단에서 담은 장보기':weekly?'주간 식단':'월간 식단 달력'}>
  <h2>{mode==='cart'?'식단에서 담은 장보기':weekly?'이번 주 식단':'한 달 식단 달력'}</h2>
  {mode==='calendar'&&<nav className="meal-period-links" aria-label="식단 기간별 보기"><Link href="/calendar/week" aria-current={weekly?'page':undefined}>주간 보기</Link><Link href="/calendar" aria-current={!weekly?'page':undefined}>월간 보기</Link></nav>}
  {!userId?<><p>로그인하면 내 설정으로 월간 식단과 장보기 목록을 저장할 수 있어요.</p><button className="primary-button" onClick={onLogin}>로그인하기</button></>:<>
   {mode==='calendar'&&<details className="calendar-preferences"><summary>월 선택·식단 취향 설정</summary><label className="real-date">계획할 달<input type="month" min="2000-01" max="2099-12" value={month} disabled={busy} onChange={e=>{if(e.target.value){setMonth(e.target.value);setPlan(null);setLoading(true);setReplace(false);setMessage('');}}}/></label><p className="body-note">마이에 저장한 식사 횟수·시간·제외 재료를 반영해요. 제공 메뉴 수에 따라 같은 메뉴가 반복될 수 있어요.</p><Link href="/profile#profile-settings">신체 정보·식단 취향 설정 →</Link></details>}
   {loading?<p role="status">저장한 설정으로 식단을 준비하고 있어요.</p>:mode==='calendar'?<>
    <details className="calendar-preferences"><summary>예산·구매 비용 확인</summary>
    <p className="body-note">월 예산 {budget!==null?won(budget):'미설정'} · {plan?`계산 가능한 상품 합계 ${won(total)}${unknown?` + 미확인 재료 ${unknown}종`:' (배송비 제외)'}`:'아직 이달 식단이 없어요.'}</p>
    {plan&&<p className="body-note">{unknown?'전체 재료 가격이 확인되지 않아 예산 안에 드는지는 아직 확정할 수 없어요.':budget!==null&&total>budget?'계산된 구매 비용이 월 예산을 초과해요. 메뉴나 예산을 조정해 주세요.':'월 합계는 한 번에 구매할 때의 묶음 계산값이에요. 주별로 나누어 구매하면 달라질 수 있어요.'}</p>}
    </details>
    {!plan?<button className="primary-button" disabled={busy||!!error} onClick={()=>act('generate')}>{busy?'식단 만드는 중…':'이달 식단 만들기'}</button>:<>
     <details className="calendar-preferences"><summary>식단 다시 만들기</summary><button className="text-link" disabled={busy} onClick={()=>setReplace(!replace)}>현재 설정으로 한 달 다시 만들기</button></details>
     {replace&&<div className="meal-notice">수정한 메뉴가 현재 마이 설정으로 바뀝니다.<button disabled={busy} onClick={()=>act('generate',{replace:true})}>다시 만들기</button><button onClick={()=>setReplace(false)}>취소</button></div>}
     {weekly&&<div className="week-navigation"><button aria-label="이전 주" disabled={busy} onClick={()=>{const next=addDays(weekStart,-7);setDate(next);if(next.slice(0,7)!==month){setMonth(next.slice(0,7));setPlan(null);setLoading(true);}}}>‹</button><div><strong>{Number(weekStart.slice(5,7))}월 {Number(weekStart.slice(8))}일 – {Number(addDays(weekStart,6).slice(5,7))}월 {Number(addDays(weekStart,6).slice(8))}일</strong><small>날짜를 선택해 식단을 확인하세요</small></div><button aria-label="다음 주" disabled={busy} onClick={()=>{const next=addDays(weekStart,7);setDate(next);if(next.slice(0,7)!==month){setMonth(next.slice(0,7));setPlan(null);setLoading(true);}}}>›</button></div>}
     <div className={`month-meal-grid ${weekly?"week-day-picker":""}`} aria-label="식단 날짜 선택">{['월','화','수','목','금','토','일'].map(x=><span key={x}>{x}</span>)}{Array.from({length:(new Date(`${visibleDays[0]?.date??month+'-01'}T00:00:00Z`).getUTCDay()+6)%7},(_,i)=><span key={`blank-${i}`}/>)}{visibleDays.map(day=><button key={day.date} aria-pressed={date===day.date} onClick={()=>setDate(day.date)}><b>{Number(day.date.slice(-2))}</b><small>{day.date===today?"오늘":`${day.recommendation.meals.length}끼`}</small></button>)}</div>
     {chosen&&<section className="selected-day-meals" aria-label="선택한 날 식단"><div className="selected-day-title"><h3>{Number(date.slice(5,7))}월 {Number(date.slice(8))}일 식단</h3><span>{chosen.recommendation.meals.length}끼 · 예상 {chosen.recommendation.total.toLocaleString('ko-KR')} kcal</span></div>{chosen.recommendation.meals.map((meal,index)=><article className="week-meal-card" key={`${date}-${index}`}><div className="week-meal-heading"><span className="week-meal-emoji" aria-hidden="true">{meal.emoji}</span><div><small>{meal.label} · {meal.time}</small><h4>{meal.name}</h4></div><button aria-label={`${meal.label} 다른 메뉴로 교체`} disabled={busy} onClick={()=>act('swap',{date,index})}>교체 ↻</button></div><p className="week-meal-nutrition">예상 {meal.kcal} kcal <span>·</span> 단백질 {meal.protein}g</p><details><summary>재료 {meal.ingredients.length}가지 · 조리법 보기</summary><ul>{meal.ingredients.map(i=><li key={i.food}><span>{i.name}</span><b>{i.grams}g</b></li>)}</ul><p>{meal.tip}</p></details></article>)}</section>}
     <div className="meal-notice"><strong>{date} ~ {rangeEnd} 장보기</strong><p>선택일부터 7일, 월말까지의 재료를 합산해요.</p><button className="primary-button" disabled={busy} onClick={()=>act('basket',{start:date})}>이 기간 재료 모두 장바구니에 담기</button><Link href="/cart">장보기 목록 열기 →</Link></div>
     <details><summary>한 달에 필요한 전체 재료</summary><IngredientRows items={plan.items}/></details>
    </>}
   </>:cart?<><p>{cart.start} ~ {cart.end} 식단 기준</p><strong>확인된 구매 금액 {won(total)}</strong><p className="body-note">{unknown?`미확인 재료 ${unknown}종의 비용과 배송비는 별도예요.`:'배송비는 별도예요.'} 이미 있는 재료는 필요한 양을 모두 보유한 경우 체크해 주세요.</p><IngredientRows items={cart.items} disabled={busy} onOwned={food=>act('owned',{owned:cart.owned.includes(food)?cart.owned.filter(x=>x!==food):[...cart.owned,food]})}/><p className="body-note">식단 메뉴가 바뀌면 필요량도 갱신돼요. 외부 쇼핑몰 구매는 각 상품 링크에서 진행해 주세요.</p><Link href="/calendar">기간·식단 변경하기 →</Link></>:<><p>아직 식단에서 담은 재료가 없어요.</p><Link href="/calendar">달력에서 이번 주 재료 담기 →</Link></>}
  </>}
  {error&&<p role="alert" className="auth-error">{error}{error.includes("마이")&&<Link href="/profile#profile-settings">신체 정보 설정으로 →</Link>}<button onClick={()=>{setLoading(true);setRevision(n=>n+1);}}>다시 불러오기</button></p>}{message&&<p role="status" className="body-success">{message}{message.includes('담았')&&<Link href="/cart"> 장보기 목록 열기 →</Link>}</p>}
 </section>;
}
