'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {SnackLog} from './snack-log';
import {RiceBuddy} from './rice-buddy';
import {useIntakeStats} from './record-progress';
import './record-entry.css';
import {pendingRecordMode,rememberRecordMode,clearRecordMode,type RecordMode} from '../lib/record-intent';

function RecordIcon({kind}:{kind:'photo'|'search'|'book'}){
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==='photo'?<><path d="M8 6 9.5 4h5L16 6h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/><path d="M17.5 9h.01"/></>:kind==='search'?<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5M8 10.5h5M10.5 8v5"/></>:<><rect x="5" y="3" width="15" height="18" rx="3"/><path d="M9 3v18M3 7h4M3 12h4M3 17h4M12 8h5M12 12h3"/></>}</svg>;
}

export function RecordEntry({userId,onLogin,onLogged}:{userId?:string;onLogin:()=>void;onLogged:()=>void}){
 const [mode,setMode]=useState<'search'|'photo'|null>(null);
 useEffect(()=>{if(!userId)return;const next=pendingRecordMode();if(!next)return;const frame=requestAnimationFrame(()=>{setMode(next);clearRecordMode();});return()=>cancelAnimationFrame(frame);},[userId]);
 function choose(next:RecordMode){if(userId){setMode(next);return;}rememberRecordMode(next);onLogin();}
 const [done,setDone]=useState(false);
 const {stats}=useIntakeStats(userId);
 return <section className="record-entry" aria-label="식사 기록하기">
  <div className="record-entry-heading">
   <div><span className="record-entry-kicker"><RecordIcon kind="book"/>나의 식사 일기</span><h2>오늘 먹은 한 끼를<br/>차곡차곡 남겨요</h2></div>
   <div className="record-entry-buddy" aria-hidden="true"><RiceBuddy/></div>
  </div>
  <p className="record-entry-intro">집밥도, 밖에서 먹은 한 끼도.<br/>편한 방법으로 오늘의 식사를 남겨보세요.</p>
  <div className="record-entry-actions">
   <button type="button" className="record-method record-method-photo" aria-label="사진으로 기록" aria-pressed={mode==='photo'} onClick={()=>choose('photo')}>
    <span className="record-method-icon"><RecordIcon kind="photo"/></span><span className="record-method-copy"><strong>사진으로 기록</strong><span>음식 선택 후 사진 분석</span></span><span className="record-method-check" aria-hidden="true">{mode==='photo'&&<svg viewBox="0 0 16 16" fill="none"><path d="m4 8 3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</span>
   </button>
   <button type="button" className="record-method record-method-search" aria-label="음식 검색으로 기록" aria-pressed={mode==='search'} onClick={()=>choose('search')}>
    <span className="record-method-icon"><RecordIcon kind="search"/></span><span className="record-method-copy"><strong>음식 검색으로 기록</strong><span>음식 이름과 먹은 양만 선택</span></span><span className="record-method-check" aria-hidden="true">{mode==='search'&&<svg viewBox="0 0 16 16" fill="none"><path d="m4 8 3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</span>
   </button>
  </div>
  <div className="record-entry-help"><Link className="record-guide-link" href="/how-to#record"><RecordIcon kind="book"/>기록이 처음이라면</Link><span>방법을 함께 알아봐요</span></div>
  {!userId&&<small className="record-entry-login-note">로그인하면 내 식사 일기에 저장하고<br/>날짜별로 다시 볼 수 있어요.</small>}
  {userId&&mode&&<SnackLog key={mode} initialOpen photo={mode==='photo'} onLogged={()=>{setDone(true);onLogged();}}/>}
  {done&&<div className="record-entry-reward" role="status"><RiceBuddy stage={stats?.buddy?.stage??0}/><div><strong>한 끼 기록, 잘했어요!</strong><p>{stats?.buddy?`끼니와 함께한 ${stats.buddy.days}일${stats.buddy.next?` · ${stats.buddy.next.gift}까지 ${stats.buddy.remaining}일`:''}`:'아래 식사 일기에 남겼어요.'}</p><small>양을 잘못 골랐다면 아래 기록에서 수정해 주세요.</small></div></div>}
 </section>;
}
