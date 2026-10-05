'use client';
import {useEffect,useState} from 'react';
import {weekStart} from '../lib/intake-stats';
import {subscribeRecordSync} from '../lib/record-sync';
import './record-album.css';
type Log={id:string;name:string;date:string;photoCount:number};
type Mode='week'|'month'|'all';
type Result={key:string;logs:Log[];nextCursor:string|null};
export function RecordWeekPhotos({userId,date,today,onDate}:{userId:string;date:string;today:string;onDate:(date:string)=>void}){
 const [mode,setMode]=useState<Mode>('week');
 const from=mode==='month'?`${date.slice(0,7)}-01`:weekStart(date);
 const end=new Date(`${from}T00:00:00Z`);
 if(mode==='month')end.setUTCMonth(end.getUTCMonth()+1,0);else end.setUTCDate(end.getUTCDate()+6);
 const to=end.toISOString().slice(0,10);
 const [revision,setRevision]=useState(0),[cursor,setCursor]=useState<string|null>(null);
 const key=`${userId}:${mode}:${mode==='all'?'all':from}:${revision}`;
 const [result,setResult]=useState<Result|null>(null),[failure,setFailure]=useState<{key:string;message:string}|null>(null),[busy,setBusy]=useState(false);
 useEffect(()=>{const refresh=()=>{setCursor(null);setRevision(n=>n+1);};window.addEventListener('intake-logged',refresh);window.addEventListener('shopping-progress-changed',refresh);const stop=subscribeRecordSync(refresh);return()=>{window.removeEventListener('intake-logged',refresh);window.removeEventListener('shopping-progress-changed',refresh);stop();};},[]);
 const range=mode==='all'?'':`?from=${from}&to=${to}`;
 useEffect(()=>{
  const controller=new AbortController();
  const url=mode==='all'?`/api/food-intake/album${cursor?`?before=${cursor}`:''}`:`/api/food-intake${range}`;
  fetch(url,{cache:'no-store',signal:controller.signal}).then(async response=>{if(!response.ok)throw Error('식사 모음을 불러오지 못했어요.');return response.json();}).then(data=>{
   if(controller.signal.aborted)return;
   setResult(previous=>({key,logs:cursor&&previous?.key===key?[...previous.logs,...data.logs.filter((log:Log)=>!previous.logs.some(old=>old.id===log.id))]:data.logs,nextCursor:data.nextCursor??null}));setFailure(null);setBusy(false);
  }).catch(error=>{if(!controller.signal.aborted){setFailure({key,message:error.message});setBusy(false);}});
  return()=>controller.abort();
 },[key,mode,range,cursor]);
 const logs=result?.key===key?result.logs:null;
 const days=logs?[...new Set(logs.map(log=>log.date))].sort().reverse():[];
 const error=failure?.key===key?failure.message:null;
 const select=(next:Mode)=>{setMode(next);setCursor(null);setBusy(false);if(next!=='all')onDate(today);};
 const chooseDay=(day:string)=>{onDate(day);document.querySelector('.food-intake > header')?.scrollIntoView({behavior:'smooth',block:'start'});};
 return <section className="record-week-album" aria-label="식사 사진과 기록 모음">
  <header><div><span>{mode==='week'?'한 주의 식탁':mode==='month'?'한 달의 식탁':'나의 모든 식탁'}</span><h3>{mode==='week'?'사진으로 꺼내 보는 한 주':mode==='month'?'사진으로 꺼내 보는 한 달':'사진으로 꺼내 보는 모든 기록'}</h3></div><small>{mode==='all'?'전체 기간':`${from.replaceAll('-','/')} – ${to.replaceAll('-','/')}`}</small></header>
  <div className="record-album-modes" role="group" aria-label="식사 모음 기간">{([['week','이번 주'],['month','이번 달'],['all','전체']] as const).map(([value,label])=><button type="button" key={value} aria-pressed={mode===value} onClick={()=>select(value)}>{label}</button>)}</div>
  {error&&<p role="alert">{error} <button type="button" onClick={()=>{setCursor(null);setRevision(n=>n+1);}}>다시 보기</button></p>}
  {!logs&&!error?<p role="status">식사 기록을 모으고 있어요…</p>:logs&&<>
   {mode==='week'?<div className="record-week-strip">{Array.from({length:7},(_,i)=>{const d=new Date(`${from}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+i);const day=d.toISOString().slice(0,10),items=logs.filter(log=>log.date===day),cover=items.find(log=>log.photoCount>0);return <button type="button" key={day} disabled={day>today} className={day===date?'is-selected':''} onClick={()=>chooseDay(day)} aria-label={`${day} 기록 ${items.length}건 보기`} aria-pressed={day===date}><span className="record-week-cover">{cover?<Photo log={cover}/>:<span aria-hidden="true">{items.length?'✎':'·'}</span>}</span><b>{['월','화','수','목','금','토','일'][i]}</b><small>{items.length?`${items.length}건`:'—'}</small></button>;})}</div>:
    <div className="record-album-days">{days.map(day=><section key={day}><button type="button" className="record-album-date" onClick={()=>chooseDay(day)}>{day.replaceAll('-','/')} · 상세 보기 →</button><div className="record-album-grid">{logs.filter(log=>log.date===day).map(log=><button type="button" key={log.id} onClick={()=>chooseDay(day)} aria-label={`${day} ${log.name} 기록 보기`}><span className="record-album-photo">{log.photoCount>0?<Photo log={log}/>:<span className="record-album-no-photo">사진 없이 남긴 한 끼</span>}</span><strong>{log.name}</strong>{log.photoCount>1&&<small>사진 {log.photoCount}장</small>}</button>)}</div></section>)}</div>}
   <p>{logs.length?`${days.length}일 · ${logs.length}건의 식사 기록${result?.nextCursor?'을 불러왔어요.':'이 모였어요.'}`:mode==='all'?'아직 남긴 식사 기록이 없어요. 사진이나 음식 이름으로 첫 한 끼를 남겨보세요.':'이 기간에 남긴 식사 기록이 없어요. 전체에서 지난 기록도 확인해 보세요.'}</p>
   {mode==='all'&&result?.nextCursor&&<button type="button" className="record-album-more" disabled={busy} onClick={()=>{setBusy(true);setCursor(result.nextCursor);}}>{busy?'불러오는 중…':'이전 기록 더 보기'}</button>}
  </>}
 </section>;
}
function Photo({log}:{log:Log}){
 // eslint-disable-next-line @next/next/no-img-element -- private authenticated diary photo
 return <img src={`/api/food-intake/photo?id=${log.id}&position=0`} alt={log.name} loading="lazy"/>;
}
