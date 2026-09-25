'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {subscribeRecordSync} from '../lib/record-sync';
import {calendarCalories} from '../lib/intake-calendar';
import {calorieHistoryRange} from '../lib/calorie-history';
import './profile-calorie-history.css';
type HistoryLog={id:string;date:string;name:string;portions:number;calories:number|null;protein:number|null;createdAt:string};
const nutrient=(value:number|null,unit:string)=>value===null||!Number.isFinite(value)?`${unit==='kcal'?'칼로리':'단백질'} 미확인`:`${Math.round(value*10)/10} ${unit}`;
export function ProfileCalorieHistory({userId,target,onLogin,analysis,weekly}:{userId?:string;target:number|null;onLogin:()=>void;analysis:ReactNode;weekly:ReactNode}){
 const [mode,setMode]=useState<'week'|'month'|'plan'|null>(null),[offset,setOffset]=useState(0),[retry,setRetry]=useState(0);
 const dialog=useRef<HTMLDialogElement>(null);
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});
 const range=calorieHistoryRange(today,mode==='month'?'month':'week',offset);
 const key=`${userId}:${range.from}:${range.fetchTo}`;
 const [data,setData]=useState<{key:string;days:ReturnType<typeof calendarCalories>;logs:HistoryLog[];error?:string}|null>(null);
 useEffect(()=>{if(!mode)return;const node=dialog.current;if(!node)return;const previous=document.body.style.overflow;node.showModal();document.body.style.overflow='hidden';return()=>{node.close();document.body.style.overflow=previous;};},[mode]);
 useEffect(()=>{
  if(!mode||mode==='plan'||!userId)return;
  const controller=new AbortController();
  fetch(`/api/food-intake?from=${range.from}&to=${range.fetchTo}`,{cache:'no-store',signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error??'기록을 불러오지 못했어요.');return d;}).then(d=>setData({key,days:calendarCalories(d.logs??[]),logs:d.logs??[]})).catch(e=>{if(!controller.signal.aborted)setData({key,days:{},logs:[],error:e.message});});
  return()=>controller.abort();
 },[mode,userId,range.from,range.fetchTo,key,retry]);
 useEffect(()=>{if(!mode||mode==='plan'||!userId)return;return subscribeRecordSync(()=>setRetry(n=>n+1));},[mode,userId]);
 const days=data?.key===key?data.days:{};
 const known=Object.values(days).filter(d=>d.count>d.missing),total=known.reduce((n,d)=>n+d.kcal,0),missing=Object.values(days).reduce((n,d)=>n+d.missing,0);
 const open=(next:'week'|'month'|'plan')=>{if(!userId&&next!=='plan'){onLogin();return;}setOffset(0);setMode(next);};
 return <section className="profile-history-shortcuts" id="weekly-report" aria-label="칼로리 기록 보기"><div><strong>내 칼로리 기록</strong><small>보고 싶은 기간만 펼쳐 봐요</small></div><div className="profile-history-buttons"><button type="button" aria-haspopup="dialog" onClick={()=>open('week')}>🗓️ 주별 보기</button><button type="button" aria-haspopup="dialog" onClick={()=>open('month')}>📅 월별 보기</button>{analysis&&<button type="button" aria-haspopup="dialog" onClick={()=>open('plan')}>🍱 추천 식단 분석</button>}</div>
 <dialog ref={dialog} className="profile-calorie-dialog" aria-labelledby="calorie-history-title" onCancel={()=>setMode(null)} onClick={e=>{if(e.target===e.currentTarget)setMode(null);}}>{mode&&<><header><h2 id="calorie-history-title">{mode==='plan'?'추천 식단 분석':mode==='week'?'주별 칼로리 기록':'월별 칼로리 기록'}</h2><button type="button" aria-label="칼로리 기록 닫기" onClick={()=>setMode(null)}>✕</button></header>{mode==='plan'?analysis:<>
 <nav aria-label="기록 기간 선택"><button type="button" onClick={()=>setOffset(n=>n-1)}>이전 {mode==='week'?'주':'달'}</button><strong>{range.from} ~ {range.to}</strong><button type="button" disabled={offset>=0} onClick={()=>setOffset(n=>n+1)}>다음 {mode==='week'?'주':'달'}</button></nav>
 {data?.key!==key?<p role="status">기록을 불러오고 있어요…</p>:data.error?<p role="alert">{data.error} <button onClick={()=>setRetry(n=>n+1)}>다시 시도</button></p>:<><div className="calorie-history-totals"><div><small>기록된 섭취 합계</small><strong>{known.length?Math.round(total).toLocaleString():'—'} <small>kcal</small></strong></div><div><small>칼로리가 확인된 {known.length}일 평균</small><strong>{known.length?Math.round(total/known.length).toLocaleString():'—'} <small>kcal</small></strong></div></div>
 <p>기록한 음식 기준입니다. 미기록일은 0 kcal로 계산하지 않아요.{missing>0&&` 칼로리 미확인 ${missing}건은 합계에서 제외했어요.`}</p>{target!==null&&<p>현재 하루 목표 <strong>{target.toLocaleString()} kcal</strong> · 과거 날짜의 목표도 현재 설정과 비교해요.</p>}
 <p className="calorie-detail-hint">날짜를 누르면 먹은 음식과 기록 시간을 자세히 볼 수 있어요.</p>
 <div className="calorie-history-days">{Array.from({length:range.days},(_,i)=>{
  const d=new Date(range.from+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+i);
  const date=d.toISOString().slice(0,10),day=days[date],logs=data.logs.filter(log=>log.date===date);
  const label=`${date.slice(5).replace('-','/')} (${'일월화수목금토'[d.getUTCDay()]})`;
  const totalLabel=!day?'기록 없음':day.count===day.missing?'칼로리 미확인':`${Math.round(day.kcal).toLocaleString()} kcal`;
  if(date>today)return <div className="calorie-history-future" key={date}><span>{label}</span><strong>예정</strong></div>;
  return <details className="calorie-history-day" key={date}><summary><span>{label}</span><span><strong>{totalLabel}</strong>{day?.missing&&day.count>day.missing?<small> + 미확인 {day.missing}건</small>:null}<small className="calorie-day-expand">상세 보기 ▾</small></span></summary>
   <div className="calorie-day-content">{logs.length?<><p>{logs.length}건의 음식 기록 · 시간은 한국 시간 기준이에요.</p><ul>{logs.map(log=><li key={log.id}><div><strong>{log.name}</strong><span>{Number.isFinite(log.portions)?`${log.portions}인분 · `:''}{Number.isFinite(Date.parse(log.createdAt))?new Date(log.createdAt).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}):'시간 미확인'} 기록</span></div><p>{nutrient(log.calories,'kcal')} · {nutrient(log.protein,'g')}</p></li>)}</ul></>:<p>이날 저장된 음식 기록이 없어요.</p>}</div>
  </details>;
 })}</div></>}
 {mode==='week'&&offset===0&&weekly}
 </>}</>}</dialog></section>;
}
