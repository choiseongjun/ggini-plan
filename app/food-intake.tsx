'use client';
import {subscribeRecordSync} from '../lib/record-sync';
import {trackAnalytics} from '../lib/analytics';
import {usePlannerLocale} from './planner-locale';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {intakeTotals,type IntakeData,type IntakeProduct} from '../lib/food-intake';
import './food-intake.css';
import {taiwanIntakeData,updateTaiwanIntake} from '../lib/taiwan-intake';
import type {PlanProduct} from '../lib/shopping-plan';
import {RecordEntry} from './record-entry';
import {EstimatedFoodCost} from './estimated-food-cost';
import {recordMealPeriod} from '../lib/intake-calendar';
import {RecordCalendar} from './record-calendar';
import {ProductThumb} from './product-thumb';
import type {LoggedExtra} from '../lib/intake-extras';

type Command={action:'eat'|'undo'|'log';id:string;version:number;productId?:string;portions?:number;extras?:LoggedExtra[]};
const number=(n:number)=>n.toLocaleString('ko-KR',{maximumFractionDigits:1});
const nutrition=(n:number|null,unit:string)=>n===null?'미확인':`${number(n)}${unit}`;

export function useFoodIntake(userId?:string,history=false,externalDate?:string){
 const locale=usePlannerLocale();
 const regionalProducts=useRef<PlanProduct[]>([]);
 const [today,setToday]=useState(()=>locale.today()),[date,setDate]=useState(()=>locale.today());
 const [data,setData]=useState<IntakeData|null>(null),[revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[loading,setLoading]=useState(Boolean(userId));
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[pending,setPending]=useState<Command|null>(null),[amounts,setAmounts]=useState<Record<string,number>>({});
 const [editing,setEditing]=useState<string|null>(null),[showAll,setShowAll]=useState(false);
 const locked=useRef(false),pendingRef=useRef<Command|null>(null);
 const selectedDate=history?(externalDate??date):today;
 useEffect(()=>{
  if(!userId)return;
  const controller=new AbortController();
  (locale.isTaiwan?fetch('/api/taiwan/catalog',{signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);regionalProducts.current=d.products;return Response.json(taiwanIntakeData(d.products,selectedDate));}):fetch(`/api/food-intake?date=${selectedDate}`,{cache:'no-store',signal:controller.signal})).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);return d as IntakeData;}).then(d=>{if(!controller.signal.aborted){setData(d);setLoading(false);}}).catch(e=>{if(!controller.signal.aborted){setLoading(false);setError(e instanceof Error?e.message:'기록을 불러오지 못했어요.');}});
  return()=>controller.abort();
 },[userId,selectedDate,revision,locale.isTaiwan]);
 useEffect(()=>{
  const refresh=()=>{if(locked.current||pendingRef.current)return;setToday(locale.today());setRevision(n=>n+1);};
  const changed=(event:Event)=>{const detail=(event as CustomEvent).detail;if(detail?.scope==='products'&&['cart','intake'].includes(detail?.source))refresh();};
  window.addEventListener('shopping-progress-changed',changed);window.addEventListener('intake-logged',refresh);const stopSync=subscribeRecordSync(refresh);
  return()=>{window.removeEventListener('shopping-progress-changed',changed);window.removeEventListener('intake-logged',refresh);stopSync();};
 },[locale]);
 function reload(){setError('');setLoading(true);setRevision(n=>n+1);}
 async function send(command:Command):Promise<boolean>{
  if(locked.current)return false;locked.current=true;pendingRef.current=command;setPending(command);setBusy(true);setError('');setMessage('');
  try{
   const r=locale.isTaiwan?await updateTaiwanIntake(command as Command&{action:'eat'|'undo'},regionalProducts.current,locale.today()).then(()=>Response.json({ok:true})).catch(error=>Response.json({error:error instanceof Error?error.message:'無法儲存紀錄。'},{status:409})):await fetch('/api/food-intake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});
   const d=await r.json();
   if(!r.ok){
    if(r.status<500){pendingRef.current=null;setPending(null);setLoading(true);setRevision(n=>n+1);}
    throw new Error(d.error??'기록을 저장하지 못했어요.');
   }
   if(command.action==='eat'||command.action==='log')trackAnalytics('meal_recorded',{method:'manual'});
   pendingRef.current=null;setPending(null);setEditing(null);
   setMessage(command.action==='eat'?'먹은 양·영양·예상 음식 비용을 기록하고 보유 수량을 줄였어요.':command.action==='log'?'먹은 음식을 기록했어요. 칼로리 분석에 바로 반영돼요.':'기록을 취소했어요.');
   setLoading(true);setToday(locale.today());setRevision(n=>n+1);
   window.dispatchEvent(new CustomEvent('shopping-progress-changed',{detail:{scope:'products',source:'intake'}}));
   return true;
  }catch(e){setError(e instanceof Error?e.message:'연결이 끊겼어요. 같은 요청으로 다시 확인해 주세요.');return false;}
  finally{locked.current=false;setBusy(false);}
 }
 // Logs what was eaten without needing it in the pantry: the dish at a portion and/or quick extras.
 async function log(productId:string|null,portions:number,extras:LoggedExtra[],deductFrom?:IntakeProduct){
  if(!data||pendingRef.current)return false;
  // Deducting from the pantry goes through the stock-checked 'eat' path; extras are logged alongside.
  if(deductFrom){
   const ok=await send({action:'eat',id:crypto.randomUUID(),version:data.version,productId:deductFrom.id,portions});
   return ok&&(!extras.length||await send({action:'log',id:crypto.randomUUID(),version:data.version,extras}));
  }
  return send({action:'log',id:crypto.randomUUID(),version:data.version,...(productId?{productId,portions}:{}),extras});
 }
 function eat(p:IntakeProduct,portions=amounts[p.id]??1){
  if(!data||pendingRef.current)return;
  void send({action:'eat',id:crypto.randomUUID(),version:data.version,productId:p.id,portions});
 }
 const current=data?.date===selectedDate?data:null;
 const totals=current?intakeTotals(current.logs):null;
 const products=current?.products??[],visible=showAll?products:products.slice(0,3);
 const disabled=busy||Boolean(pending)||loading;
 return {today,date,setDate,current,totals,products,visible,disabled,loading,error,message,pending,busy,reload,send,eat,log,editing,setEditing,amounts,setAmounts,showAll,setShowAll,setLoading,setError,selectedDate,pendingRef};
}

export function FoodIntake({userId,onLogin,history=false,recordDate,onDateChange}:{expenseManagement?:ReactNode;userId?:string;onLogin:()=>void;history?:boolean;recordDate?:string;onDateChange?:(date:string)=>void}){
 const locale=usePlannerLocale();
 const {today,setDate,current,totals,products,visible,disabled,loading,error,message,pending,busy,reload,send,eat,editing,setEditing,amounts,setAmounts,showAll,setShowAll,setLoading,setError,selectedDate,pendingRef}=useFoodIntake(userId,history,recordDate);
 const [editingLog,setEditingLog]=useState<string|null>(null),[logPortions,setLogPortions]=useState('1'),[editBusy,setEditBusy]=useState(false);
 async function saveAmount(id:string){setEditBusy(true);setError('');try{const r=await fetch('/api/food-intake',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,portions:Number(logPortions),version:current?.version})});const d=await r.json();if(!r.ok)throw new Error(d.error);setEditingLog(null);reload();window.dispatchEvent(new CustomEvent('shopping-progress-changed',{detail:{scope:'products',source:'intake'}}));}catch(e){setError(e instanceof Error?e.message:'수정하지 못했어요.');}finally{setEditBusy(false);}}
 return locale.render(<section className="food-intake" aria-label={history?'먹은 음식 기록':'오늘 먹은 음식'}>
  {!locale.isTaiwan&&<RecordEntry userId={userId} onLogin={onLogin} onLogged={()=>{setDate(today);onDateChange?.(today);reload();}}/>}
  {userId&&<header><span className="section-kicker">날짜별 식사 일기</span><h2>{history?'실제로 먹은 기록':'오늘, 얼마나 챙겨 먹었나요?'}</h2><p>날짜를 골라 지난 식사를 보고, 먹은 양을 수정하거나 기록을 삭제할 수 있어요.</p></header>}
  {!userId?null:<>
   {history&&<RecordCalendar date={selectedDate} today={today} disabled={busy||Boolean(pending)||editBusy} onChange={value=>{if(value===selectedDate)return;setDate(value);onDateChange?.(value);setEditingLog(null);setLoading(true);setError('');}}/>}
   {loading&&<div className="intake-loading" role="status"><span>식사 일기를 불러오고 있어요</span><div className="intake-loading-track" aria-hidden="true"><i/></div></div>}
   {error&&<div role="alert" className="intake-error"><p>{error}</p>{pending?<button type="button" disabled={busy} onClick={()=>void send(pending)}>저장 결과 다시 확인</button>:<button type="button" disabled={busy} onClick={reload}>다시 불러오기</button>}</div>}
   {message&&<p role="status" className="intake-message">{message}</p>}
   {totals&&<>
    <details className="record-calorie-detail" key={selectedDate}><summary>전체 칼로리 보러가기 <span>›</span></summary><p>{selectedDate} · 기록된 섭취량</p>
    <div className="intake-totals"><div><span>{selectedDate===today?'오늘':'이날'} 섭취 칼로리</span><strong>{number(totals.calories)}<small> kcal</small></strong>{totals.missingCalories>0&&<small>칼로리 미확인 {totals.missingCalories}건 별도</small>}</div><div><span>섭취 단백질</span><strong>{number(totals.protein)}<small> g</small></strong>{totals.missingProtein>0&&<small>단백질 미확인 {totals.missingProtein}건 별도</small>}</div></div>
    <p className="intake-note">{current!.logs.length?'직접 먹었다고 기록한 음식의 합계예요.':'아직 먹은 기록이 없어요.'} 간편식은 상품 표시, 직접 요리는 재료 영양의 합산 예상치예요. 미확인 수치는 합계에 포함하지 않아요.</p>
    <ul className="record-calorie-list">{current!.logs.map(log=><li key={log.id}><span>{log.name}</span><strong>{nutrition(log.calories,' kcal')}</strong></li>)}</ul></details>
   </>}
   {(!history||selectedDate===today)&&current&&<details className="intake-pantry"><summary>보유한 음식에서 기록하기</summary>
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
   </details>}
   {current&&<div className="intake-history" id="meal-history"><div className="intake-section-title"><h3>{history?'선택한 날의 기록':'오늘 먹은 기록'}</h3>{!history&&<Link href="/record">날짜별로 보기 →</Link>}</div>
    {!current.logs.length?<p className="intake-note">먹은 음식을 기록하면 시간과 섭취량이 여기에 쌓여요.</p>:current.logs.map(log=><article key={log.id}><div><small>{recordMealPeriod(log.createdAt)} 시간대 · {new Date(log.createdAt).toLocaleTimeString(locale.isTaiwan?'zh-TW':'ko-KR',{timeZone:locale.isTaiwan?'Asia/Taipei':'Asia/Seoul',hour:'2-digit',minute:'2-digit'})} · {log.portions}회분</small><strong>{log.name}</strong>{Boolean(log.photoCount)&&<div className="intake-diary-photos">{Array.from({length:log.photoCount??0},(_,i)=>{const src=`/api/food-intake/photo?id=${log.id}&position=${i}`;return <a key={i} href={src} target="_blank" rel="noreferrer" aria-label={`${log.name} 사진 ${i+1} 크게 보기`}>{/* eslint-disable-next-line @next/next/no-img-element -- authenticated private diary photo */}
<img src={src} alt={`${log.name} 식사 사진 ${i+1}`} loading="lazy"/></a>;})}</div>}<span>{nutrition(log.calories,'kcal')} · 단백질 {nutrition(log.protein,'g')}</span></div><details className="intake-log-tools"><summary>관리</summary><div className="intake-log-actions">{!locale.isTaiwan&&(editingLog===log.id?<><select aria-label={`${log.name} 먹은 양 수정`} value={logPortions} disabled={editBusy} onChange={e=>setLogPortions(e.target.value)}>{Array.from(new Set([0.25,0.5,0.75,1,1.5,2,3,4,log.portions])).sort((a,b)=>a-b).map(n=><option key={n} value={n}>{n}회분</option>)}</select><button type="button" disabled={editBusy||disabled} onClick={()=>void saveAmount(log.id)}>저장</button><button type="button" disabled={editBusy} onClick={()=>setEditingLog(null)}>닫기</button></>:<button type="button" disabled={disabled||editBusy} aria-label={`${log.name} 양 수정`} onClick={()=>{setEditingLog(log.id);setLogPortions(String(log.portions));}}>양 수정</button>)}<button type="button" disabled={disabled||editBusy} aria-label={`${log.name} 기록 삭제`} onClick={()=>{if(!pendingRef.current)void send({action:'undo',id:log.id,version:current.version});}}>삭제</button></div></details></article>)}
   </div>}
   {!locale.isTaiwan&&<EstimatedFoodCost date={selectedDate}/>}
  </>}
 </section>);
}
