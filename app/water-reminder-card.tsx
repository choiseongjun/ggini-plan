'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {DEFAULT_WATER_TIMES,parseWaterReminder} from '../lib/water-reminder';
import './meal-reminder-card.css';
export function WaterReminderCard({userId}:{userId?:string}){
  const [enabled,setEnabled]=useState(false),[times,setTimes]=useState(DEFAULT_WATER_TIMES),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[revision,setRevision]=useState(0);
  useEffect(()=>{
    if(!userId)return;
    const c=new AbortController();
    fetch('/api/water-reminders',{cache:'no-store',signal:c.signal}).then(async r=>{if(!r.ok)throw Error('설정을 불러오지 못했어요.');const value=parseWaterReminder(await r.json());if(!value)throw Error('설정을 확인하지 못했어요.');if(!c.signal.aborted){setEnabled(value.enabled);setTimes(value.times);setReady(true);setError('');}}).catch(e=>{if(!c.signal.aborted)setError(e.message);});
    return()=>c.abort();
  },[userId,revision]);
  if(!userId)return null;
  async function save(){
    const value=parseWaterReminder({enabled,times});if(!value){setError('오전 6시~오후 10시 사이, 1시간 이상 간격으로 설정해 주세요.');return;}
    setBusy(true);setError('');setMessage('');
    try{const r=await fetch('/api/water-reminders',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});if(!r.ok)throw Error('저장하지 못했어요. 다시 시도해 주세요.');setTimes(value.times);setMessage(enabled?'물 알림 시간을 저장했어요. 이 기기의 알림 연결도 켜져 있어야 도착해요.':'물 알림을 껐어요.');}catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요.');}finally{setBusy(false);}
  }
  return <section className="mr-card" aria-label="물 섭취 알림"><header><div><span className="mr-kicker">물 섭취 알림</span><h3>잊기 쉬운 물 한 잔, 정한 시간에</h3></div></header>
    {!ready&&!error&&<p role="status">설정을 불러오고 있어요…</p>}
    {ready&&<form onSubmit={e=>{e.preventDefault();void save();}}><fieldset disabled={busy}><label className="mr-slot"><input type="checkbox" checked={enabled} onChange={e=>{setEnabled(e.target.checked);setMessage('');}}/>물 알림 받기</label>
      <ul className="mr-times">{times.map((time,i)=><li key={i}><label htmlFor={`water-time-${i}`}>{i+1}번째</label><input id={`water-time-${i}`} type="time" min="06:00" max="22:00" required value={time} onChange={e=>setTimes(v=>v.map((t,j)=>i===j?e.target.value:t))}/><button type="button" disabled={times.length===1} aria-label={`${i+1}번째 알림 삭제`} onClick={()=>setTimes(v=>v.filter((_,j)=>j!==i))}>삭제</button></li>)}</ul>
      {times.length<6&&<button type="button" onClick={()=>setTimes(v=>[...v,'20:00'])}>시간 추가</button>}<button type="submit" className="mr-test">{busy?'저장 중…':'물 알림 설정 저장'}</button>
    </fieldset></form>}
    <p className="mr-note">한국 시간 기준 · 하루 최대 6번. 오늘 기록한 물의 양을 알려드려요. 목표를 채웠거나 최근 45분 안에 기록했다면 건너뛰어요. 물 기록 표시를 끄면 발송도 쉬어요.</p>
    <p className="mr-note">기기 연결이 필요해요. <Link href="/profile#meal-reminders">앱·브라우저 알림 연결 확인 →</Link></p>
    {error&&<p role="alert" className="mr-error">{error}{!ready&&<button onClick={()=>setRevision(v=>v+1)}>다시 불러오기</button>}</p>}{message&&<p role="status" className="mr-msg">{message}</p>}
  </section>;
}
