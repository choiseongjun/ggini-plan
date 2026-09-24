'use client';

import {useEffect,useState} from 'react';
import {invalidateJson} from '../lib/client-cache';
import {trackPlanner} from '../lib/track-planner';
import './weight-card.css';

type Log={day:string;weight:number};
const fmt=(day:string)=>`${Number(day.slice(5,7))}/${Number(day.slice(8))}`;
const kg=(n:number)=>`${n>0?'+':n<0?'−':''}${Math.abs(n).toFixed(1)}kg`;
export const WEIGHT_LOGGED_EVENT='weight-logged';

// 체중 기록: 다이어트 목표에서 매주 다시 여는 가장 큰 이유. 지난 값이 미리 채워져 있어 ±0.1로 빠르게 기록한다.
export function WeightCard({userId,fallbackWeight,onLogged}:{userId:string;fallbackWeight:number|null;onLogged?:(weight:number)=>void}){
 const [logs,setLogs]=useState<Log[]|null>(null);
 const [value,setValue]=useState<number|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 const [today]=useState(()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10));
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/weight',{cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.json():null).then(d=>{if(d&&!controller.signal.aborted)setLogs(d.logs);}).catch(()=>{});
  return()=>controller.abort();
 },[userId]);
 const last=logs?.at(-1)??null;
 const input=value??last?.weight??fallbackWeight??60;
 async function send(method:'POST'|'DELETE',body?:unknown){
  setBusy(true);setError('');setSaved(false);
  try{
   const r=await fetch(method==='POST'?'/api/weight':`/api/weight?day=${today}`,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
   const d=await r.json();if(!r.ok)throw new Error(d.error);
   setLogs(d.logs);setValue(null);setSaved(method==='POST');
   const latest=(d.logs as Log[]).at(-1);if(method==='POST'){trackPlanner('weight_logged');if(latest?.day===today)onLogged?.(latest.weight);}
   // 몸무게가 바뀌면 칼로리 목표·추천 개인화도 바뀐다.
   invalidateJson('/api/shopping-plan');window.dispatchEvent(new CustomEvent(WEIGHT_LOGGED_EVENT));
  }catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요.');}
  finally{setBusy(false);}
 }
 if(!logs)return <section className="wc-card" aria-busy="true"><div className="wc-skeleton"/></section>;
 const first=logs[0],loggedToday=last?.day===today;
 const change=first&&last&&first.day!==last.day?last.weight-first.weight:null;
 const weeks=first&&last?Math.max(1,Math.round((Date.parse(last.day)-Date.parse(first.day))/(7*86400000))):0;

 // 그래프: 최근 기록을 날짜 간격대로 배치
 const points=logs.slice(-24);
 const min=Math.min(...points.map(p=>p.weight)),max=Math.max(...points.map(p=>p.weight));
 const pad=Math.max(0.5,(max-min)*0.2),lo=min-pad,hi=max+pad;
 const t0=points.length?Date.parse(points[0].day):0,t1=points.length?Date.parse(points.at(-1)!.day):1;
 const x=(d:string)=>points.length<2?150:12+(Date.parse(d)-t0)/Math.max(1,t1-t0)*276;
 const y=(w:number)=>8+(hi-w)/(hi-lo)*84;
 const path=points.map((p,i)=>`${i?'L':'M'}${x(p.day).toFixed(1)},${y(p.weight).toFixed(1)}`).join(' ');

 return <section className="wc-card" aria-label="체중 기록">
  <header><span className="wc-kicker">체중 기록</span>{last&&<small>{loggedToday?'오늘 기록했어요':`마지막 기록 ${fmt(last.day)}`}</small>}</header>
  {last?<div className="wc-hero"><strong>{last.weight.toFixed(1)}<small>kg</small></strong>{change!==null&&<span className={change<0?'is-down':change>0?'is-up':''}>{weeks}주 전보다 {kg(change)}</span>}</div>
   :<p className="wc-empty">첫 체중을 기록해 보세요. 기록이 쌓이면 식단에 따른 변화를 그래프로 보여 드려요.</p>}
  {points.length>=2&&<svg className="wc-chart" viewBox="0 0 300 100" role="img" aria-label={`최근 체중 ${points.map(p=>`${fmt(p.day)} ${p.weight}kg`).join(', ')}`}>
   <path d={path} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
   {points.map(p=><circle key={p.day} cx={x(p.day)} cy={y(p.weight)} r={p===points.at(-1)?4.5:3}/>)}
  </svg>}
  {points.length>=2&&<div className="wc-axis"><span>{fmt(points[0].day)}</span><span>{fmt(points.at(-1)!.day)}</span></div>}
  <div className="wc-input">
   <button type="button" aria-label="0.1kg 줄이기" disabled={busy} onClick={()=>setValue(Math.round((input-0.1)*10)/10)}>−</button>
   <label><input type="number" inputMode="decimal" step={0.1} min={25} max={350} value={input} aria-label="오늘 체중(kg)" onChange={e=>setValue(Number(e.target.value))}/><span>kg</span></label>
   <button type="button" aria-label="0.1kg 늘리기" disabled={busy} onClick={()=>setValue(Math.round((input+0.1)*10)/10)}>+</button>
   <button type="button" className="wc-save" disabled={busy} onClick={()=>void send('POST',{weight:input})}>{busy?'저장 중…':loggedToday?'오늘 기록 수정':'오늘 기록'}</button>
  </div>
  {saved&&<p className="wc-saved" role="status">기록했어요. 칼로리 목표도 새 체중으로 다시 계산돼요.</p>}
  {loggedToday&&!saved&&<button type="button" className="wc-undo" disabled={busy} onClick={()=>void send('DELETE')}>오늘 기록 지우기</button>}
  {error&&<p className="wc-error" role="alert">{error}</p>}
  <small className="wc-note">아침 공복에 같은 조건으로 재면 변화가 더 정확하게 보여요. 주 1~2번이면 충분해요.</small>
 </section>;
}
