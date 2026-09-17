'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {emptyDashboard} from '../lib/dashboard';
import {intakeTotals,type IntakeData,type IntakeProduct} from '../lib/food-intake';
import './food-intake.css';
import {ProductThumb} from './product-thumb';

type Command={action:'eat'|'undo';id:string;version:number;productId?:string;portions?:number};
const number=(n:number)=>n.toLocaleString('ko-KR',{maximumFractionDigits:1});
const nutrition=(n:number|null,unit:string)=>n===null?'미확인':`${number(n)}${unit}`;

export function useFoodIntake(userId?:string,history=false){
 const [today,setToday]=useState(()=>emptyDashboard().today),[date,setDate]=useState(()=>emptyDashboard().today);
 const [data,setData]=useState<IntakeData|null>(null),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[loading,setLoading]=useState(Boolean(userId));
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[pending,setPending]=useState<Command|null>(null),[amounts,setAmounts]=useState<Record<string,number>>({});
 const [editing,setEditing]=useState<string|null>(null),[showAll,setShowAll]=useState(false);
 const locked=useRef(false),pendingRef=useRef<Command|null>(null);
 const selectedDate=history?date:today;
 useEffect(()=>{
  if(!userId)return;
  const controller=new AbortController();
  fetch(`/api/food-intake?date=${selectedDate}`,{cache:'no-store',signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);return d as IntakeData;}).then(d=>{if(!controller.signal.aborted){setData(d);setLoading(false);}}).catch(e=>{if(!controller.signal.aborted){setLoading(false);setError(e instanceof Error?e.message:'기록을 불러오지 못했어요.');}});
  return()=>controller.abort();
 },[userId,selectedDate,revision]);
 useEffect(()=>{
  const refresh=()=>{setToday(emptyDashboard().today);setRevision(n=>n+1);};
  const changed=(event:Event)=>{const detail=(event as CustomEvent).detail;if(detail?.scope==='products'&&['cart','intake'].includes(detail?.source))refresh();};
  window.addEventListener('shopping-progress-changed',changed);window.addEventListener('focus',refresh);
  const timer=window.setInterval(()=>setToday(emptyDashboard().today),60000);
  return()=>{window.removeEventListener('shopping-progress-changed',changed);window.removeEventListener('focus',refresh);window.clearInterval(timer);};
 },[]);
 function reload(){setError('');setLoading(true);setRevision(n=>n+1);}
 async function send(command:Command){
  if(locked.current)return;locked.current=true;pendingRef.current=command;setPending(command);setBusy(true);setError('');setMessage('');
  try{
   const r=await fetch('/api/food-intake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});
   const d=await r.json();
   if(!r.ok){
    if(r.status<500){pendingRef.current=null;setPending(null);setLoading(true);setRevision(n=>n+1);}
    throw new Error(d.error??'기록을 저장하지 못했어요.');
   }
   pendingRef.current=null;setPending(null);setEditing(null);
   setMessage(command.action==='eat'?'먹은 기록과 남은 수량에 반영했어요.':'기록을 취소하고 보유 수량을 되돌렸어요.');
   setLoading(true);setToday(emptyDashboard().today);setRevision(n=>n+1);
   window.dispatchEvent(new CustomEvent('shopping-progress-changed',{detail:{scope:'products',source:'intake'}}));
  }catch(e){setError(e instanceof Error?e.message:'연결이 끊겼어요. 같은 요청으로 다시 확인해 주세요.');}
  finally{locked.current=false;setBusy(false);}
 }
 function eat(p:IntakeProduct,portions=amounts[p.id]??1){
  if(!data||pendingRef.current)return;
  void send({action:'eat',id:crypto.randomUUID(),version:data.version,productId:p.id,portions});
 }
 const current=data?.date===selectedDate?data:null;
 const totals=current?intakeTotals(current.logs):null;
 const products=current?.products??[],visible=showAll?products:products.slice(0,3);
 const disabled=busy||Boolean(pending)||loading;
 return {today,date,setDate,current,totals,products,visible,disabled,loading,error,message,pending,busy,reload,send,eat,editing,setEditing,amounts,setAmounts,showAll,setShowAll,setLoading,setError,selectedDate,pendingRef};
}

export function FoodIntake({userId,onLogin,history=false}:{userId?:string;onLogin:()=>void;history?:boolean}){
 const {today,date,setDate,current,totals,products,visible,disabled,loading,error,message,pending,busy,reload,send,eat,editing,setEditing,amounts,setAmounts,showAll,setShowAll,setLoading,setError,selectedDate,pendingRef}=useFoodIntake(userId,history);
 return <section className="food-intake" aria-label={history?'먹은 음식 기록':'오늘 먹은 음식'}>
  <header><span className="section-kicker">한 번 누르면 기록 끝</span><h2>{history?'실제로 먹은 기록':'오늘, 얼마나 챙겨 먹었나요?'}</h2><p>먹었어요를 누르면 칼로리·단백질과 남은 음식이 함께 반영돼요.</p></header>
  {!userId?<div className="intake-empty"><p>구매한 음식의 영양정보를 불러와요. 음식 이름과 영양 수치를 다시 입력하지 않아도 돼요.</p><button type="button" onClick={onLogin}>로그인하고 먹은 기록 시작하기</button></div>:<>
   {history&&<label className="intake-date">기록 날짜<input type="date" value={date} max={today} disabled={busy||Boolean(pending)} onChange={e=>{if(e.target.value){setDate(e.target.value);setLoading(true);setError('');}}}/></label>}
   {loading&&<p role="status">먹은 기록을 불러오는 중…</p>}
   {error&&<div role="alert" className="intake-error"><p>{error}</p>{pending?<button type="button" disabled={busy} onClick={()=>void send(pending)}>저장 결과 다시 확인</button>:<button type="button" disabled={busy} onClick={reload}>다시 불러오기</button>}</div>}
   {message&&<p role="status" className="intake-message">{message}</p>}
   {totals&&<>
    <div className="intake-totals"><div><span>{selectedDate===today?'오늘':'이날'} 섭취 칼로리</span><strong>{number(totals.calories)}<small> kcal</small></strong>{totals.missingCalories>0&&<small>칼로리 미확인 {totals.missingCalories}건 별도</small>}</div><div><span>섭취 단백질</span><strong>{number(totals.protein)}<small> g</small></strong>{totals.missingProtein>0&&<small>단백질 미확인 {totals.missingProtein}건 별도</small>}</div></div>
    <p className="intake-note">{current!.logs.length?'직접 먹었다고 기록한 음식의 합계예요.':'아직 먹은 기록이 없어요.'} 상품 표시 영양 기준이며 미확인 수치는 합계에 포함하지 않아요.</p>
   </>}
   {(!history||selectedDate===today)&&current&&<>
    <div className="intake-section-title"><h3>보유한 음식 기록하기</h3><Link href="/cart">구매한 음식 관리 →</Link></div>
    {!products.length?<div className="intake-empty"><p>장바구니에서 산 음식을 한꺼번에 선택하고 ‘직접 샀어요’ 또는 ‘받았어요’를 눌러 주세요. 1회분이 확인된 상품이 여기에 표시돼요.</p><Link href="/cart">구매한 음식 등록하기 →</Link></div>:<>
     <div className="intake-foods">{visible.map(p=>{const amount=amounts[p.id]??1;return <article key={p.id}>
      <div className="intake-food-heading"><ProductThumb item={{color:"",productImageUrl:p.image,emoji:"🍽️"}}/><div><h4>{p.name}</h4><small>남은 양 {number(p.available)}회분 · {p.servingNote}</small></div></div>
      <p className="intake-food-nutrition">{amount}회분 · {nutrition(p.calories===null?null:p.calories*amount,'kcal')} · 단백질 {nutrition(p.protein===null?null:p.protein*amount,'g')}</p>
      {editing===p.id&&<label className="intake-amount">먹은 양<select aria-label={`${p.name} 먹은 양`} value={amount} disabled={disabled} onChange={e=>setAmounts(prev=>({...prev,[p.id]:Number(e.target.value)}))}>{[0.25,0.5,0.75,1,1.5,2,3,4].map(n=><option key={n} value={n}>{n}회분{n===1?' (기본)':''}</option>)}</select></label>}
      <div className="intake-food-actions"><button type="button" className="primary-button" disabled={disabled||amount>p.available+0.00001} onClick={()=>eat(p)} aria-label={`${p.name} ${amount}회분 먹었어요`}>{busy&&pending?.productId===p.id?'기록 중…':'먹었어요'}</button><button type="button" disabled={disabled} onClick={()=>setEditing(editing===p.id?null:p.id)}>양 변경</button></div>
      {amount>p.available+0.00001&&<small>남은 양에 맞게 먹은 양을 바꿔 주세요.</small>}
     </article>;})}</div>
     {products.length>3&&<button type="button" className="intake-more" onClick={()=>setShowAll(!showAll)}>{showAll?'간단히 보기':`다른 음식 ${products.length-3}종 보기`}</button>}
    </>}
   </>}
   {current&&<div className="intake-history"><div className="intake-section-title"><h3>{history?'선택한 날의 기록':'오늘 먹은 기록'}</h3>{!history&&<Link href="/record">날짜별로 보기 →</Link>}</div>
    {!current.logs.length?<p className="intake-note">먹은 음식을 기록하면 시간과 섭취량이 여기에 쌓여요.</p>:current.logs.map(log=><article key={log.id}><div><small>{new Date(log.createdAt).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit'})} · {log.portions}회분</small><strong>{log.name}</strong><span>{nutrition(log.calories,'kcal')} · 단백질 {nutrition(log.protein,'g')}</span></div><button type="button" disabled={disabled} aria-label={`${log.name} 기록 취소`} onClick={()=>{if(!pendingRef.current)void send({action:'undo',id:log.id,version:current.version});}}>취소</button></article>)}
   </div>}
  </>}
 </section>;
}
