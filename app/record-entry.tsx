'use client';

import {RecordSavedFeedback,type SavedMeal} from './record-saved-feedback';
import {RecentMealReuse} from './recent-meal-reuse';
import {mealTimeLocal} from '../lib/meal-time';
import {trackAnalytics} from '../lib/analytics';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {DevicePhotoEntry} from './device-photo-entry';
import {FoodSearchModal} from './food-search-modal';
import {RiceBuddy} from './rice-buddy';
import {useIntakeStats} from './record-progress';
import './record-entry.css';
import styles from './nutrition-home.module.css';
import {pendingRecordMode,rememberRecordMode,clearRecordMode,rememberRecordFood,pendingRecordPortions,pendingRecordFood,takeRecordFood,recordPortions,type RecordMode} from '../lib/record-intent';
import type {FoodReference} from '../lib/food-reference';
import {readMealDraft,writeMealDraft,deleteMealDraft,type MealDraft} from '../lib/meal-draft';

function RecordIcon({kind}:{kind:'photo'|'search'|'book'}){
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==='photo'?<><path d="M8 6 9.5 4h5L16 6h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/><path d="M17.5 9h.01"/></>:kind==='search'?<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5M8 10.5h5M10.5 8v5"/></>:<><rect x="5" y="3" width="15" height="18" rx="3"/><path d="M9 3v18M3 7h4M3 12h4M3 17h4M12 8h5M12 12h3"/></>}</svg>;
}

export function RecordEntry({userId,onLogin,onLogged,compact=false}:{compact?:boolean;userId?:string;onLogin:()=>void;onLogged:(date?:string)=>void}){
 const [resumed,setResumed]=useState(false);
 const [mode,setMode]=useState<'search'|'photo'|null>(null);
 const [initialPortions,setInitialPortions]=useState(1);
 const [initialFood,setInitialFood]=useState<FoodReference|null>(null);
 const [storedDraft,setDraft]=useState<MealDraft|null>(null),[draftError,setDraftError]=useState('');
 const draft=storedDraft?.owner===(userId??'guest')?storedDraft:null;
 useEffect(()=>{let alive=true;const owner=userId??'guest',resumeGuest=Boolean(pendingRecordMode());
  async function restore(){try{let saved=await readMealDraft(owner);
   if(!saved&&userId&&resumeGuest){const guest=await readMealDraft('guest');if(guest){saved={...guest,owner};await writeMealDraft(saved);await deleteMealDraft('guest',guest.id);}}
   if(alive)setDraft(saved);
  }catch{if(alive)setDraftError('이 기기의 임시 보관함을 열지 못했어요. 브라우저 저장 공간을 확인해 주세요.');}}
  void restore();return()=>{alive=false;};
 },[userId]);
 async function keepDraft(next:MealDraft){await writeMealDraft(next);setDraft(next);setDraftError('');}
 async function discardDraft(){if(!draft)return;try{await deleteMealDraft(draft.owner,draft.id);setDraft(null);setInitialFood(null);}catch{setDraftError('임시 사진을 삭제하지 못했어요. 다시 시도해 주세요.');}}
 async function keepPhoto(photo:Blob){await keepDraft({id:crypto.randomUUID(),owner:userId??'guest',photo,createdAt:new Date().toISOString()});}
 useEffect(()=>{if(!userId)return;const next=pendingRecordMode();if(!next)return;const frame=requestAnimationFrame(()=>{setMode(next);setResumed(true);clearRecordMode();});return()=>cancelAnimationFrame(frame);},[userId]);
 // 칼로리 페이지의 '먹었어요'(/record?log=음식코드): 그 음식을 고른 채로 기록 창을 연다. 비회원도 먼저 음식과 양을 확인하고 저장할 때 로그인한다.
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search),fromLink=params.get('log');
  if(fromLink){rememberRecordFood(fromLink,recordPortions(params.get('portions')));params.delete('log');params.delete('portions');window.history.replaceState(null,'',`${window.location.pathname}${params.size?`?${params}`:''}`);}
  const savedPortions=pendingRecordPortions();
  const code=fromLink??pendingRecordFood();
  if(!code)return;
  let alive=true;
  fetch(`/api/food-reference?code=${encodeURIComponent(code)}`).then(r=>r.ok?r.json():null).then(d=>{if(!alive)return;const food=d?.items?.[0]??null;setInitialFood(food);setInitialPortions(savedPortions);setMode('search');if(food)trackAnalytics('record_food_ready',{method:'search'});else setDraftError('선택한 음식을 불러오지 못했어요. 음식 이름으로 다시 찾아주세요.');}).catch(()=>{if(alive){setDraftError('음식을 불러오지 못했어요. 연결을 확인하고 다시 검색해 주세요.');setMode('search');}});
  return()=>{alive=false;};
  // Resume the selected food when authentication finishes.
 },[userId]);
 function choose(next:RecordMode){setResumed(false);trackAnalytics('record_method_selected',{method:next});setMode(next);}

 const [done,setDone]=useState(false);
 const [saved,setSaved]=useState<SavedMeal|null>(null);
 const {stats}=useIntakeStats(userId);
 return <section className={`record-entry ${styles.entry}`} data-compact={compact||undefined} aria-label="식사 기록하기">
  {saved&&<RecordSavedFeedback key={saved.ids.join()} meal={saved}/>}
  <div className="record-entry-heading">
   <div><span className="record-entry-kicker"><RecordIcon kind="book"/>나의 식사 일기</span><h2>잘 먹었든 막 먹었든, 일단 기록.</h2></div>
   <div className="record-entry-buddy" aria-hidden="true"><RiceBuddy/></div>
  </div>
  <p className="record-entry-intro">거창한 식단 말고, 방금 먹은 것부터. 사진이나 이름으로 남겨요.</p>
  {draft&&mode!=='photo'&&<div className={styles.photoFlow} role="status"><strong>마저 정리할 한 끼가 있어요</strong><p>{new Date(draft.createdAt).toLocaleString('ko-KR')} · {draft.photoItems?`음식 ${draft.photoItems.length}개 확인 중`:draft.food?.name??'사진 임시 보관됨'}</p><small>{draft.photoSavePending?'저장 결과 확인이 필요해요. 이어서 기록하기를 눌러 중복 없이 다시 확인해 주세요.':'아직 영양 합계에는 포함되지 않아요. 이 기기에서 이어갈 수 있으며, 브라우저 데이터를 삭제하면 임시 사진도 사라져요.'}</small><button type="button" className="record-guide-link" onClick={()=>{setInitialFood(draft.food??null);choose(draft.photoItems?'photo':draft.food?'search':'photo');}}>이어서 기록하기 →</button></div>}
  {draftError&&<p role="alert">{draftError}</p>}
  {resumed&&<p className="record-entry-intro" role="status">로그인됐어요. {mode==='photo'?'아래 음식 사진 선택 버튼을 눌러 이어서 기록해 주세요.':'음식을 검색해 이어서 기록해 주세요.'}</p>}
  <div className="record-entry-actions">
   <button type="button" className="record-method record-method-photo" aria-label="사진으로 식사 기록 시작" aria-pressed={mode==='photo'} onClick={()=>choose('photo')}>
    <span className="record-method-icon"><RecordIcon kind="photo"/></span><span className="record-method-copy"><strong>사진으로 한 끼 기록</strong><span>맛있었다는 증거 한 장 · 무료 베타</span></span><span className="record-method-check" aria-hidden="true">{mode==='photo'&&<svg viewBox="0 0 16 16" fill="none"><path d="m4 8 3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</span>
   </button>
   <button type="button" className="record-method record-method-search" aria-label="음식 검색으로 기록" aria-haspopup="dialog" aria-pressed={mode==='search'} onClick={()=>choose('search')}>
    <span className="record-method-icon"><RecordIcon kind="search"/></span><span className="record-method-copy"><strong>음식 검색</strong><span>로그인 전에도 검색 가능</span></span><span className="record-method-check" aria-hidden="true">{mode==='search'&&<svg viewBox="0 0 16 16" fill="none"><path d="m4 8 3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</span>
   </button>
  </div>
  {userId&&mode===null&&<button type="button" className={styles.secondaryLink} onClick={()=>choose('search')}>전에 먹은 음식 다시 기록 <span>지난번 먹은 양 불러오기 →</span></button>}
  <div className="record-entry-help"><Link className="record-guide-link" href="/how-to#record"><RecordIcon kind="book"/>기록이 처음이라면</Link></div>
  {userId&&!compact&&mode===null&&<RecentMealReuse key={userId}/>}
  {!userId&&<small className="record-entry-login-note">로그인하면 내 식사 일기에 저장하고<br/>날짜별로 다시 볼 수 있어요.</small>}
  {mode==='photo'&&<DevicePhotoEntry userId={userId} onLogin={()=>{rememberRecordMode('photo');onLogin();}} draft={draft} onPhoto={keepPhoto} onDiscard={()=>void discardDraft()} onDraftChange={keepDraft} onSaved={result=>{if(draft){void deleteMealDraft(draft.owner,draft.id).catch(()=>setDraftError('일기는 저장됐지만 임시 사진 정리가 안 됐어요.'));setDraft(null);}setSaved({name:result.food?.name??'한 끼',date:mealTimeLocal(result.eatenAt??new Date()).slice(0,10),ids:result.ids,nutrition:result.nutrition,mealSlot:result.mealSlot});setDone(true);setMode(null);onLogged(result.eatenAt?mealTimeLocal(result.eatenAt).slice(0,10):undefined);}} onSearch={()=>choose('search')}/>}
  {mode==='search'&&<FoodSearchModal initialPortions={initialPortions} onRequireLogin={userId?undefined:(food,portions)=>{setInitialFood(food);setInitialPortions(portions);rememberRecordFood(food.code,portions);rememberRecordMode('search');setMode(null);onLogin();}} key={draft?.id??initialFood?.code??'manual'} draft={draft} onDraftChange={keepDraft} initialFood={initialFood??draft?.food} onClose={()=>{setMode(null);setResumed(false);setInitialFood(null);setInitialPortions(1);takeRecordFood();}} onLogged={(name,eatenAt,result)=>{if(draft){void deleteMealDraft(draft.owner,draft.id).catch(()=>setDraftError('일기는 저장됐지만 임시 사진 정리가 안 됐어요. 임시 사진을 삭제해 주세요.'));setDraft(null);}setSaved({name,date:mealTimeLocal(eatenAt??new Date()).slice(0,10),ids:result?.ids??[],nutrition:result?.nutrition,mealSlot:result?.mealSlot});setDone(true);onLogged(eatenAt?mealTimeLocal(eatenAt).slice(0,10):undefined);}}/>}
  {done&&<div className="record-entry-reward" role="status"><RiceBuddy stage={stats?.buddy?.stage??0}/><div><strong>먹고 기록까지. 오늘 좀 부지런했다.</strong><p>{stats?.buddy?`끼니와 함께한 ${stats.buddy.days}일${stats.buddy.next?` · ${stats.buddy.next.gift}까지 ${stats.buddy.remaining}일`:''}`:'아래 식사 일기에 남겼어요.'}</p>{stats?.week&&<small>이번 주 {stats.week.days}일의 식사 이야기가 모였어요.</small>}</div></div>}
 </section>;
}
