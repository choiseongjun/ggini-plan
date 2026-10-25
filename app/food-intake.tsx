'use client';

import {WellnessTracker} from './wellness-tracker';
import {DiaryMealCard} from './diary-meal-card';
import {RecordWeekPhotos} from './record-week-photos';
import {RecordTimeEditor} from './record-time-editor';
import {mealGroups,eatenTime} from '../lib/meal-time';
import {subscribeRecordSync} from '../lib/record-sync';
import {trackAnalytics} from '../lib/analytics';
import {usePlannerLocale} from './planner-locale';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {intakeTotals,type IntakeData,type IntakeProduct} from '../lib/food-intake';
import './food-intake.css';
import './record-journal.css';
import {taiwanIntakeData,updateTaiwanIntake} from '../lib/taiwan-intake';
import type {PlanProduct} from '../lib/shopping-plan';
import {RecordEntry} from './record-entry';
import {EstimatedFoodCost} from './estimated-food-cost';
import {RecordCalendar} from './record-calendar';
import {ProductThumb} from './product-thumb';
import type {LoggedExtra} from '../lib/intake-extras';
import {addGuestLog,guestIntakeData,undoGuestLog,type GuestSnapshot} from '../lib/guest-intake';
import type {MealSlot} from '../lib/meal-time';

type Command={action:'eat'|'undo'|'log';id:string;version:number;productId?:string;portions?:number;extras?:LoggedExtra[];mealSlot?:MealSlot;
 /** 비회원 기록용 영양 스냅숏(서버는 메뉴 id로 다시 계산하므로 보내지 않는다). */ guest?:GuestSnapshot};
const recordNutrients=[['calories','칼로리',' kcal'],['carbs','탄수화물',' g'],['protein','단백질',' g'],['fat','지방',' g'],['sugar','당류',' g'],['sodium','나트륨',' mg']] as const;
const number=(n:number)=>n.toLocaleString('ko-KR',{maximumFractionDigits:1});
const nutrition=(n:number|null|undefined,unit:string)=>n==null?'미확인':`${number(n)}${unit}`;

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
  // 비회원: 이 기기에 남긴 '먹었어요' 기록을 보여 준다(로그인하면 계정으로 옮긴다).
  if(!userId){if(locale.isTaiwan)return;const frame=requestAnimationFrame(()=>setData(guestIntakeData(selectedDate)));return()=>cancelAnimationFrame(frame);}
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
  if(locked.current)return false;
  if(!userId&&!locale.isTaiwan){
   if(command.action==='log'&&command.productId&&command.guest)addGuestLog({id:command.id,date:selectedDate,productId:command.productId,portions:command.portions??1,mealSlot:command.mealSlot,snapshot:command.guest});
   else if(command.action==='undo')undoGuestLog(command.id);
   else return false;
   if(command.action==='log')trackAnalytics('meal_recorded',{method:'manual'});
   setRevision(n=>n+1);window.dispatchEvent(new CustomEvent('intake-logged'));
   return true;
  }
  locked.current=true;pendingRef.current=command;setPending(command);setBusy(true);setError('');setMessage('');
  try{
   const r=locale.isTaiwan?await updateTaiwanIntake(command as Command&{action:'eat'|'undo'},regionalProducts.current,locale.today()).then(()=>Response.json({ok:true})).catch(error=>Response.json({error:error instanceof Error?error.message:'無法儲存紀錄。'},{status:409})):await fetch('/api/food-intake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...command,guest:undefined})});
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
 const composer=useRef<HTMLDetailsElement>(null);
 function changeDay(offset:number){const day=new Date(`${selectedDate}T12:00:00Z`);day.setUTCDate(day.getUTCDate()+offset);const next=day.toISOString().slice(0,10);if(next>today)return;setDate(next);onDateChange?.(next);setLoading(true);setError('');setEditingLog(null);}
 const [editingLog,setEditingLog]=useState<string|null>(null),[logPortions,setLogPortions]=useState('1'),[editBusy,setEditBusy]=useState(false);
 async function saveAmount(id:string){setEditBusy(true);setError('');try{const r=await fetch('/api/food-intake',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,portions:Number(logPortions),version:current?.version})});const d=await r.json();if(!r.ok)throw new Error(d.error);setEditingLog(null);reload();window.dispatchEvent(new CustomEvent('shopping-progress-changed',{detail:{scope:'products',source:'intake'}}));}catch(e){setError(e instanceof Error?e.message:'수정하지 못했어요.');}finally{setEditBusy(false);}}
 return locale.render(<section className="food-intake" aria-label={history?'먹은 음식 기록':'오늘 먹은 음식'}>
  <header className="diary-page-heading"><div><span className="diary-eyebrow">매일 쌓이는 나의 식탁</span><h2>식사 일기</h2></div><button type="button" className="diary-add" onClick={()=>{if(composer.current){composer.current.open=!composer.current.open;if(composer.current.open)composer.current.scrollIntoView({behavior:'smooth',block:'start'});}}}>+ 한 끼 기록</button></header>
  {!locale.isTaiwan&&<details ref={composer} className="diary-composer"><summary>사진이나 이름으로 기록하기</summary><RecordEntry userId={userId} onLogin={onLogin} onLogged={date=>{setDate(date??today);onDateChange?.(date??today);reload();if(composer.current)composer.current.open=false;}}/></details>}
  {!userId?null:<>
   {history&&<div className="diary-date-navigation"><button type="button" aria-label="이전 날짜" disabled={disabled||editBusy} onClick={()=>changeDay(-1)}>‹</button><details className="journal-calendar"><summary><strong>{selectedDate===today?'오늘 · ':''}{new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'short',timeZone:'UTC'})}</strong><span>날짜 선택 ⌄</span></summary><RecordCalendar date={selectedDate} today={today} disabled={busy||Boolean(pending)||editBusy} onChange={value=>{if(value===selectedDate)return;setDate(value);onDateChange?.(value);setEditingLog(null);setLoading(true);setError('');}}/></details><button type="button" aria-label="다음 날짜" disabled={selectedDate>=today||disabled||editBusy} onClick={()=>changeDay(1)}>›</button></div>}
   {current&&totals&&current.logs.length>0&&<section className="diary-day-summary" aria-label="선택한 날의 기록 요약"><div><span>기록한 칼로리</span><strong>{totals.missingCalories===current.logs.length?'미확인':Math.round(totals.calories).toLocaleString()}<small>{totals.missingCalories===current.logs.length?'':' kcal'}</small></strong><small>음식 {current.logs.length}개 · {mealGroups(current.logs).length}개 끼니</small></div><dl><div><dt>탄수화물</dt><dd>{totals.missing_carbs===current.logs.length?'미확인':`${Math.round(totals.carbs)}g`}</dd></div><div><dt>단백질</dt><dd>{totals.missingProtein===current.logs.length?'미확인':`${Math.round(totals.protein)}g`}</dd></div><div><dt>지방</dt><dd>{totals.missing_fat===current.logs.length?'미확인':`${Math.round(totals.fat)}g`}</dd></div></dl>{(totals.missingCalories+totals.missingProtein+totals.missing_carbs+totals.missing_fat)>0&&<p>미확인 영양소는 합계에서 제외돼요.</p>}</section>}

   {loading&&<div className="intake-loading" role="status"><span>식사 일기를 불러오고 있어요</span><div className="intake-loading-track" aria-hidden="true"><i/></div></div>}
   {error&&<div role="alert" className="intake-error"><p>{error}</p>{pending?<button type="button" disabled={busy} onClick={()=>void send(pending)}>저장 결과 다시 확인</button>:<button type="button" disabled={busy} onClick={reload}>다시 불러오기</button>}</div>}
   {message&&<p role="status" className="intake-message">{message}</p>}
   {current&&<div className="intake-history" id="meal-history"><div className="diary-timeline-heading"><h3>그날의 식탁</h3><span>사진을 누르면 크게 볼 수 있어요</span></div>
    {!current.logs.length?<div className="diary-empty"><strong>아직 남긴 한 끼가 없어요</strong><p>사진 한 장으로 오늘의 식탁을 채워 보세요.</p><button type="button" onClick={()=>{if(composer.current){composer.current.open=true;composer.current.scrollIntoView({behavior:'smooth',block:'start'});}}}>첫 한 끼 기록하기</button></div>:mealGroups(current.logs).map(group=><section className="intake-time-group" key={group.period} aria-label={`${group.period} 먹은 기록`}><h4>{group.period}<small>{group.logs.length}건</small></h4>{group.logs.map(log=><DiaryMealCard key={log.id} log={log} taiwan={locale.isTaiwan} tools={<details className="intake-log-tools"><summary>수정·삭제</summary><div className="intake-log-actions">{!locale.isTaiwan&&<RecordTimeEditor id={log.id} name={log.name} time={eatenTime(log)} mealSlot={log.mealSlot} version={current.version} disabled={disabled||editBusy} onSaved={date=>{setDate(date);onDateChange?.(date);reload();}}/>}{!locale.isTaiwan&&!log.productId.startsWith('source-')&&(editingLog===log.id?<><select aria-label={`${log.name} 먹은 양 수정`} value={logPortions} disabled={editBusy} onChange={e=>setLogPortions(e.target.value)}>{Array.from(new Set([0.25,0.5,0.75,1,1.5,2,3,4,log.portions])).sort((a,b)=>a-b).map(n=><option key={n} value={n}>{n}회분</option>)}</select><button type="button" disabled={editBusy||disabled} onClick={()=>void saveAmount(log.id)}>저장</button><button type="button" disabled={editBusy} onClick={()=>setEditingLog(null)}>닫기</button></>:<button type="button" disabled={disabled||editBusy} aria-label={`${log.name} 양 수정`} onClick={()=>{setEditingLog(log.id);setLogPortions(String(log.portions));}}>양 수정</button>)}<button type="button" disabled={disabled||editBusy} aria-label={`${log.name} 기록 삭제`} onClick={()=>{if(!pendingRef.current)void send({action:'undo',id:log.id,version:current.version});}}>삭제</button></div></details>}/>)}</section>)}
   </div>}
   {!locale.isTaiwan&&history&&userId&&<details className="diary-album-fold"><summary>지난 식사 사진 모아보기</summary><RecordWeekPhotos userId={userId} date={selectedDate} today={today} onDate={value=>{if(value===selectedDate)return;setDate(value);onDateChange?.(value);setEditingLog(null);setLoading(true);setError('');}}/></details>}
   {totals&&<>
    <details className="record-calorie-detail" key={selectedDate}><summary>하루 영양소 합계 <span>›</span></summary><p>{selectedDate} · 기록된 섭취량</p>
    <div className="intake-totals"><div><span>{selectedDate===today?'오늘':'이날'} 섭취 칼로리</span><strong>{number(totals.calories)}<small> kcal</small></strong>{totals.missingCalories>0&&<small>칼로리 미확인 {totals.missingCalories}건 별도</small>}</div><div><span>섭취 단백질</span><strong>{number(totals.protein)}<small> g</small></strong>{totals.missingProtein>0&&<small>단백질 미확인 {totals.missingProtein}건 별도</small>}</div></div>
    <div className="record-nutrition"><dl>{(['carbs','fat','sugar','sodium'] as const).map(key=>{const field=recordNutrients.find(n=>n[0]===key)!;const missing=totals[`missing_${key}`];return <div key={key}><dt>{field[1]}</dt><dd>{current!.logs.length>0&&missing===current!.logs.length?'미확인':nutrition(totals[key],field[2])}</dd>{missing>0&&<small>미확인 {missing}건 별도</small>}</div>;})}</dl></div>
    <p className="intake-note">{current!.logs.length?'직접 먹었다고 기록한 음식의 합계예요.':'아직 먹은 기록이 없어요.'} 간편식은 상품 표시, 직접 요리는 재료 영양의 합산 예상치예요. 미확인 수치는 합계에 포함하지 않아요.</p>
    <ul className="record-calorie-list">{current!.logs.map(log=><li key={log.id}><div className="record-food-summary"><span>{log.name}</span><strong>{nutrition(log.calories,' kcal')}</strong></div><dl className="record-food-nutrients" aria-label={`${log.name} 영양소`}>{recordNutrients.filter(([key])=>key!=='calories').map(([key,label,unit])=><div key={key}><dt>{label}</dt><dd>{nutrition(log[key],unit)}</dd></div>)}</dl></li>)}</ul></details>
   </>}
   {(!history||selectedDate===today)&&current&&<details className="intake-pantry"><summary>보유한 음식에서 기록하기</summary>
    <div className="intake-section-title"><h3>보유한 음식 기록하기</h3><Link href="/cart">구매한 음식 관리 →</Link></div>
    {!products.length?<div className="intake-empty"><p>장바구니에서 산 음식을 한꺼번에 선택하고 ‘직접 샀어요’ 또는 ‘받았어요’를 눌러 주세요. 1회분이 확인된 상품이 여기에 표시돼요.</p><Link href="/cart">구매한 음식 등록하기 →</Link></div>:<>
     <div className="intake-foods">{visible.map(p=>{const amount=amounts[p.id]??1;return <article key={p.id}>
      <div className="intake-food-heading"><ProductThumb item={{color:"",productImageUrl:p.image,emoji:"🍽️"}}/><div><h4>{p.name}</h4><small>남은 양 {number(p.available)}인분 · {p.servingNote}</small></div></div>
      <p className="intake-food-nutrition">{amount}인분 · {nutrition(p.calories===null?null:p.calories*amount,'kcal')} · 단백질 {nutrition(p.protein===null?null:p.protein*amount,'g')}</p>
      {editing===p.id&&<label className="intake-amount">먹은 양<select aria-label={`${p.name} 먹은 양`} value={amount} disabled={disabled} onChange={e=>setAmounts(prev=>({...prev,[p.id]:Number(e.target.value)}))}>{[0.25,0.5,0.75,1,1.5,2,3,4].map(n=><option key={n} value={n}>{n}회분{n===1?' (기본)':''}</option>)}</select></label>}
      <div className="intake-food-actions"><button type="button" className="primary-button" disabled={disabled||amount>p.available+0.00001} onClick={()=>eat(p)} aria-label={`${p.name} ${amount}인분 먹었어요`}>{busy&&pending?.productId===p.id?'기록 중…':'먹었어요'}</button><button type="button" disabled={disabled} onClick={()=>setEditing(editing===p.id?null:p.id)}>양 변경</button></div>
      {amount>p.available+0.00001&&<small>남은 양에 맞게 먹은 양을 바꿔 주세요.</small>}
     </article>;})}</div>
     {products.length>3&&<button type="button" className="intake-more" onClick={()=>setShowAll(!showAll)}>{showAll?'간단히 보기':`다른 음식 ${products.length-3}종 보기`}</button>}
    </>}
   </details>}
   {!locale.isTaiwan&&<details className="information-detail"><summary>이날의 식비</summary><EstimatedFoodCost date={selectedDate}/></details>}
  </>}
  {!locale.isTaiwan&&history&&<details className="information-detail"><summary>생활 기록 · 물·체중</summary><WellnessTracker key={`${userId??'guest'}:${recordDate??today}`} userId={userId} date={recordDate??today} onLogin={onLogin}/></details>}
 </section>);
}
