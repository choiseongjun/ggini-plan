'use client';
import {useState} from 'react';
import {SnackLog} from './snack-log';
import {RiceBuddy} from './rice-buddy';
import {useIntakeStats} from './record-progress';
import './record-entry.css';

export function RecordEntry({userId,onLogin,onLogged}:{userId?:string;onLogin:()=>void;onLogged:()=>void}){
 const [mode,setMode]=useState<'search'|'photo'|null>(null);
 const [done,setDone]=useState(false);
 const {stats}=useIntakeStats(userId);
 return <section className="record-entry" aria-label="식사 기록하기">
  <span className="record-entry-kicker">나의 식사 일기</span><h2>오늘 먹은 한 끼를 남겨요</h2>
  <p>추천받지 않은 음식도, 밖에서 먹은 한 끼도 괜찮아요.</p>
  <div className="record-entry-actions"><button type="button" aria-pressed={mode==='photo'} onClick={()=>userId?setMode('photo'):onLogin()}>사진으로 기록</button><button type="button" aria-pressed={mode==='search'} onClick={()=>userId?setMode('search'):onLogin()}>음식 검색으로 기록</button></div>
  {!userId&&<small>로그인하면 기록을 저장하고 날짜별로 다시 볼 수 있어요.</small>}
  {userId&&mode&&<SnackLog key={mode} initialOpen photo={mode==='photo'} onLogged={()=>{setDone(true);onLogged();}}/>}
  {done&&<div className="record-entry-reward" role="status"><RiceBuddy stage={stats?.buddy?.stage??0}/><div><strong>한 끼 기록, 잘했어요!</strong><p>{stats?.buddy?`끼니와 함께한 ${stats.buddy.days}일${stats.buddy.next?` · ${stats.buddy.next.gift}까지 ${stats.buddy.remaining}일`:''}`:'아래 식사 일기에 남겼어요.'}</p><small>양을 잘못 골랐다면 아래 기록에서 수정해 주세요.</small></div></div>}
 </section>;
}
