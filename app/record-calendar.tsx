'use client';
import {useEffect,useState} from 'react';
import './record-calendar.css';
import {subscribeRecordSync} from '../lib/record-sync';
import {calendarCalories} from '../lib/intake-calendar';

export function RecordCalendar({date,today,disabled,onChange}:{date:string;today:string;disabled:boolean;onChange:(date:string)=>void}){
 const month=date.slice(0,7),[year,number]=month.split('-').map(Number);
 const days=new Date(Date.UTC(year,number,0)).getUTCDate();
 const start=new Date(Date.UTC(year,number-1,1)).getUTCDay();
 const [revision,setRevision]=useState(0);
 const [result,setResult]=useState<{month:string;counts:ReturnType<typeof calendarCalories>;error?:boolean}|null>(null);
 useEffect(()=>{
  const refresh=()=>setRevision(value=>value+1);
  const stopSync=subscribeRecordSync(refresh);
  const changed=(event:Event)=>{if((event as CustomEvent).detail?.source==='intake')refresh();};
  window.addEventListener('intake-logged',refresh);window.addEventListener('shopping-progress-changed',changed);
  return()=>{stopSync();window.removeEventListener('intake-logged',refresh);window.removeEventListener('shopping-progress-changed',changed);};
 },[]);
 useEffect(()=>{
  const controller=new AbortController();
  fetch(`/api/food-intake?from=${month}-01&to=${month}-${days}`,{cache:'no-store',signal:controller.signal})
   .then(async response=>{if(!response.ok)throw Error();return response.json();})
   .then(data=>{if(controller.signal.aborted)return;const counts=calendarCalories(data.logs??[]);setResult({month,counts});})
   .catch(()=>{if(!controller.signal.aborted)setResult({month,counts:{},error:true});});
  return()=>controller.abort();
 },[month,days,revision]);
 const move=(offset:number)=>{const next=new Date(Date.UTC(year,number-1+offset,1)).toISOString().slice(0,10);onChange(next>today?today:next);};
 return <section className="record-calendar" aria-label="식사 기록 달력">
  <header><div><small>나의 식사 달력</small><h3>{year}년 {number}월</h3></div><div className="record-calendar-nav"><button type="button" disabled={disabled} onClick={()=>move(-1)} aria-label="이전 달">‹</button><button type="button" disabled={disabled||month>=today.slice(0,7)} onClick={()=>move(1)} aria-label="다음 달">›</button><button type="button" disabled={disabled} onClick={()=>onChange(today)}>오늘</button></div></header>
  <div className="record-calendar-week" aria-hidden="true">{['일','월','화','수','목','금','토'].map(day=><span key={day}>{day}</span>)}</div>
  <div className="record-calendar-days">{Array.from({length:start},(_,i)=><span key={`empty-${i}`}/>)}{Array.from({length:days},(_,i)=>{
   const value=`${month}-${String(i+1).padStart(2,'0')}`,day=result?.month===month?result.counts[value]:undefined;
   return <button type="button" key={value} disabled={disabled||value>today} aria-pressed={date===value} aria-current={value===today?'date':undefined} aria-label={`${number}월 ${i+1}일${day?`, ${day.periods.join('·')} 시간대, 기록 ${day.count}건, ${Math.round(day.kcal)} kcal${day.missing?`, 미확인 ${day.missing}건`:''}`:''}`} onClick={()=>onChange(value)}><span>{i+1}</span><small>{day?(day.count===day.missing?'미확인':`${Math.round(day.kcal).toLocaleString('ko-KR')}${day.missing?'+':''}`):' '}</small><span className="calendar-meal-periods" aria-hidden="true">{day?.periods.map(period=><i key={period} title={`${period} 시간대 기록`}>{period==='아침'?'아':period==='점심'?'점':period==='저녁'?'저':'밤'}</i>)}</span></button>;
  })}</div>
  <p role="status">{result?.month!==month?'기록한 날짜를 불러오고 있어요.':result.error?'기록 표시를 불러오지 못했어요. 날짜를 눌러 확인할 수 있어요.':'하루 kcal · +는 미확인 음식 포함. 아·점·저·밤은 기록 시간대 기준이에요.'}</p>
 </section>;
}
