'use client';
import {RecordSavedFeedback,type SavedMeal} from './record-saved-feedback';
import {mealTimeLocal} from '../lib/meal-time';
import {trackAnalytics} from '../lib/analytics';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {MealPhotoLog,type MealPhotoPickerHandle} from './meal-photo-log';
import {FoodSearchModal} from './food-search-modal';
import {RiceBuddy} from './rice-buddy';
import {useIntakeStats} from './record-progress';
import './record-entry.css';
import {pendingRecordMode,rememberRecordMode,clearRecordMode,type RecordMode} from '../lib/record-intent';

function RecordIcon({kind}:{kind:'photo'|'search'|'book'}){
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==='photo'?<><path d="M8 6 9.5 4h5L16 6h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/><path d="M17.5 9h.01"/></>:kind==='search'?<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5M8 10.5h5M10.5 8v5"/></>:<><rect x="5" y="3" width="15" height="18" rx="3"/><path d="M9 3v18M3 7h4M3 12h4M3 17h4M12 8h5M12 12h3"/></>}</svg>;
}

export function RecordEntry({userId,onLogin,onLogged}:{userId?:string;onLogin:()=>void;onLogged:(date?:string)=>void}){
 const [resumed,setResumed]=useState(false);
 const photoPicker=useRef<MealPhotoPickerHandle>(null);
 const [mode,setMode]=useState<'search'|'photo'|null>(null);
 useEffect(()=>{if(!userId)return;const next=pendingRecordMode();if(!next)return;const frame=requestAnimationFrame(()=>{setMode(next);setResumed(true);clearRecordMode();});return()=>cancelAnimationFrame(frame);},[userId]);
 function choose(next:RecordMode){setResumed(false);trackAnalytics('record_method_selected',{method:next});if(userId){setMode(next);if(next==='photo')photoPicker.current?.open();return;}rememberRecordMode(next);onLogin();}
 const [done,setDone]=useState(false);
 const [saved,setSaved]=useState<SavedMeal|null>(null);
 const {stats}=useIntakeStats(userId);
 return <section className="record-entry" aria-label="식사 기록하기">
  <div className="record-entry-heading">
   <div><span className="record-entry-kicker"><RecordIcon kind="book"/>나의 식사 일기</span><h2>오늘, 무엇을 드셨나요?</h2></div>
   <div className="record-entry-buddy" aria-hidden="true"><RiceBuddy/></div>
  </div>
  <p className="record-entry-intro">한 끼도, 작은 간식도 남겨보세요.</p>
  {resumed&&<p className="record-entry-intro" role="status">로그인됐어요. {mode==='photo'?'아래 음식 사진 선택 버튼을 눌러 이어서 기록해 주세요.':'음식을 검색해 이어서 기록해 주세요.'}</p>}
  <div className="record-entry-actions">
   <button type="button" className="record-method record-method-photo" aria-label="음식 사진 선택" aria-pressed={mode==='photo'} onClick={()=>choose('photo')}>
    <span className="record-method-icon"><RecordIcon kind="photo"/></span><span className="record-method-copy"><strong>사진으로 기록</strong><span>사진 한 장으로</span></span><span className="record-method-check" aria-hidden="true">{mode==='photo'&&<svg viewBox="0 0 16 16" fill="none"><path d="m4 8 3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</span>
   </button>
   <button type="button" className="record-method record-method-search" aria-label="음식 검색으로 기록" aria-haspopup="dialog" aria-pressed={mode==='search'} onClick={()=>choose('search')}>
    <span className="record-method-icon"><RecordIcon kind="search"/></span><span className="record-method-copy"><strong>음식 검색</strong><span>이름으로 찾아서</span></span><span className="record-method-check" aria-hidden="true">{mode==='search'&&<svg viewBox="0 0 16 16" fill="none"><path d="m4 8 3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</span>
   </button>
  </div>
  <div className="record-entry-help"><Link className="record-guide-link" href="/how-to#record"><RecordIcon kind="book"/>기록이 처음이라면</Link></div>
  {!userId&&<small className="record-entry-login-note">로그인하면 내 식사 일기에 저장하고<br/>날짜별로 다시 볼 수 있어요.</small>}
  {userId&&<div hidden={mode==='search'}><MealPhotoLog pickerRef={photoPicker} hidePickerActions dishName="오늘 먹은 음식" disabled={false} onManual={()=>setMode('search')} onFallback={()=>setMode('search')} onLogged={result=>{setSaved({name:result.food?.name??'사진 속 음식',date:mealTimeLocal(result.eatenAt??new Date()).slice(0,10),ids:result.ids,nutrition:result.nutrition,mealSlot:result.mealSlot});setDone(true);window.dispatchEvent(new CustomEvent('intake-logged'));onLogged(result.eatenAt?mealTimeLocal(result.eatenAt).slice(0,10):undefined);}}/></div>}
  {userId&&mode==='search'&&<FoodSearchModal onClose={()=>{setMode(null);setResumed(false);}} onLogged={(name,eatenAt,result)=>{setSaved({name,date:mealTimeLocal(eatenAt??new Date()).slice(0,10),ids:result?.ids??[],nutrition:result?.nutrition,mealSlot:result?.mealSlot});setDone(true);onLogged(eatenAt?mealTimeLocal(eatenAt).slice(0,10):undefined);}}/>}
  {saved&&<RecordSavedFeedback key={saved.ids.join()} meal={saved}/>}
  {done&&<div className="record-entry-reward" role="status"><RiceBuddy stage={stats?.buddy?.stage??0}/><div><strong>나를 챙긴 순간이 하나 더!</strong><p>{stats?.buddy?`끼니와 함께한 ${stats.buddy.days}일${stats.buddy.next?` · ${stats.buddy.next.gift}까지 ${stats.buddy.remaining}일`:''}`:'아래 식사 일기에 남겼어요.'}</p>{stats?.week&&<small>이번 주 {stats.week.days}일의 식사 이야기가 모였어요.</small>}</div></div>}
 </section>;
}
