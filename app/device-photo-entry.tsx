'use client';

import {useEffect,useRef,useState} from 'react';
import {trackAnalytics} from '../lib/analytics';
import {Button,Notice} from './components/ui';
import styles from './nutrition-home.module.css';
import type {MealDraft} from '../lib/meal-draft';
import {shrink} from './meal-photo-log';
import type {PhotoFood} from '../lib/groq-food-photo';
import {hasNativePhotoPicker,pickNativePhoto} from '../lib/native-photo';
import {PhotoMealReview,type PhotoMealSaved} from './photo-meal-review';

export function DevicePhotoEntry({onSaved,onDraftChange,onSearch,draft,onPhoto,onDiscard,userId,onLogin}:{onSaved:(result:PhotoMealSaved)=>void;onDraftChange:(draft:MealDraft)=>Promise<void>;onSearch:()=>void;draft:MealDraft|null;onPhoto:(photo:Blob)=>Promise<void>;onDiscard:()=>void;userId?:string;onLogin:()=>void}){
 const input=useRef<HTMLInputElement>(null),camera=useRef<HTMLInputElement>(null),generation=useRef(0);
 const photo=draft?.photo??null;
 const [url,setUrl]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 const [consent,setConsent]=useState(false);
 const [candidates,setCandidates]=useState<PhotoFood[]>([]),[error,setError]=useState(''),[savingMeal,setSavingMeal]=useState(false);
 const [reviewing,setReviewing]=useState(false);
 const [replacement,setReplacement]=useState<File|null>(null),[confirmDelete,setConfirmDelete]=useState(false);
 useEffect(()=>{if(!photo)return;const value=URL.createObjectURL(photo);const frame=requestAnimationFrame(()=>setUrl(value));return()=>{cancelAnimationFrame(frame);URL.revokeObjectURL(value);};},[photo]);
 useEffect(()=>()=>{generation.current++;},[]);
 function stop(){generation.current++;setBusy(false);setStatus('');}
 async function keepFile(file:File){
  if(draft?.photoSavePending){setError('저장 결과를 먼저 확인해 주세요. 확인 전에는 사진을 바꿀 수 없어요.');return;}
  stop();setError('');
  if(file.size>20*1024*1024){setError('20MB 이하 사진을 선택해 주세요.');return;}
  const run=++generation.current;
  setBusy(true);setStatus('사진을 준비하고 있어요…');
  try{const image=await shrink(file);if(generation.current!==run)return;if(image.size>8*1024*1024||!['image/jpeg','image/png','image/webp'].includes(image.type))throw Error('사진을 변환하지 못했어요. JPG 또는 PNG 사진을 선택해 주세요.');await onPhoto(image);setCandidates([]);setReviewing(false);setConfirmDelete(false);}
  catch(e){if(generation.current===run)setError(e instanceof Error?e.message:'사진을 보관하지 못했어요. 다시 시도해 주세요.');}
  finally{if(generation.current===run){setBusy(false);setStatus('');}}
 }
 async function receiveFile(file:File){if(photo){setReplacement(file);return;}await keepFile(file);}
 async function choosePhoto(source:'camera'|'album'){
  if(!hasNativePhotoPicker()){(source==='camera'?camera:input).current?.click();return;}
  setBusy(true);setError('');setStatus(source==='camera'?'카메라에서 촬영해 주세요.':'앨범에서 사진을 골라 주세요.');
   try{const file=await pickNativePhoto(source);if(file)await receiveFile(file);}
  catch(e){setError(e instanceof Error?e.message:'사진 선택창을 열지 못했어요.');}
  finally{setBusy(false);setStatus('');}
 }
 async function analyze(){
  if(!photo||busy)return;
  if(!userId){onLogin();return;}
  if(!consent){setError('사진 전송 안내를 확인하고 동의해 주세요.');return;}
  setBusy(true);setError('');setCandidates([]);setStatus('사진 속 음식을 각각 찾고 있어요…');
  const run=++generation.current;
  const started=performance.now();
  trackAnalytics('photo_analysis_started',{method:'photo',photo_count:1});
  try{
   const form=new FormData();form.set('photo',photo,'meal.jpg');form.set('consent','groq-photo-v1');
   const response=await fetch('/api/food-photo/recognize',{method:'POST',body:form,signal:AbortSignal.timeout(50_000)});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||'사진을 분석하지 못했어요.');
   if(generation.current!==run)return;
   trackAnalytics('photo_analysis_completed',{method:'photo',duration_ms:performance.now()-started,photo_count:1});
   setCandidates(result.foods);setReviewing(true);if(!result.foods.length)setError('사진에서 음식을 구분하지 못했어요. 아래에서 음식 이름을 직접 추가해 주세요.');
  }catch(e){if(generation.current===run){trackAnalytics('photo_analysis_failed',{method:'photo',duration_ms:performance.now()-started,failure:e instanceof Error&&e.name==='TimeoutError'?'timeout':'server'});setError(e instanceof Error?e.message:'사진을 분석하지 못했어요.');}}
  finally{if(generation.current===run){setBusy(false);setStatus('');}}
 }
 return <section className={styles.photoFlow} aria-label="음식 사진 분석">
  <input ref={input} type="file" accept="image/*" hidden onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void receiveFile(file);}}/>
  <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void receiveFile(file);}}/>
  {/* eslint-disable-next-line @next/next/no-img-element -- local photo stays on this device */}
  {photo&&url&&<img className={styles.preview} src={url} alt="분석할 식사 사진"/>}
  <div className={styles.chips}>
   <Button disabled={busy||savingMeal||!!draft?.photoSavePending} onClick={()=>void choosePhoto('camera')}>{photo?'다시 촬영':'사진 촬영'}</Button>
   <Button variant="secondary" disabled={busy||savingMeal||!!draft?.photoSavePending} onClick={()=>void choosePhoto('album')}>앨범에서 선택</Button>
  </div>
  {replacement&&<Notice><p>작성 중인 음식과 먹은 양을 지우고 새 사진으로 바꿀까요?</p><div className={styles.chips}><Button disabled={busy||savingMeal} onClick={()=>{const file=replacement;setReplacement(null);void keepFile(file);}}>새 사진으로 바꾸기</Button><Button variant="secondary" onClick={()=>setReplacement(null)}>기존 기록 유지</Button></div></Notice>}
  {photo&&<>
   {!reviewing&&!draft?.photoItems&&<label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> 음식 인식을 위해 사진을 Groq에 전송하는 데 동의합니다. <a href="/privacy#meal-photos">처리 안내</a></label>}
   {!reviewing&&!draft?.photoItems&&!busy&&<Button block disabled={Boolean(userId)&&!consent} onClick={()=>void analyze()}>{userId?'AI로 음식 찾기':'로그인하고 무료 분석'}</Button>}
   <Button variant="ghost" disabled={busy||savingMeal||!!draft?.photoSavePending} onClick={()=>setConfirmDelete(true)}>사진 삭제</Button>
   {confirmDelete&&<Notice><p>이 사진과 아직 저장하지 않은 수정 내용을 삭제할까요?</p><div className={styles.chips}><Button disabled={busy||savingMeal||!!draft?.photoSavePending} onClick={()=>{stop();setCandidates([]);setReviewing(false);setConfirmDelete(false);setReplacement(null);onDiscard();}}>삭제하기</Button><Button variant="secondary" onClick={()=>setConfirmDelete(false)}>계속 작성</Button></div></Notice>}
  </>}
  {busy&&<Notice>{status}<Button variant="ghost" onClick={stop}>취소</Button></Notice>}
  {error&&<Notice tone="error">{error}</Notice>}
  {draft&&(reviewing||draft.photoItems)&&<PhotoMealReview key={draft.id} draft={draft} initialFoods={candidates} onDraftChange={onDraftChange} onSaved={onSaved} onBusyChange={setSavingMeal}/>}
  {!reviewing&&!draft?.photoItems&&<Button variant="ghost" disabled={busy||savingMeal} onClick={()=>{if(photo){if(!userId){onLogin();return;}setCandidates([]);setReviewing(true);setError('');}else onSearch();}}>{photo?'AI 없이 음식 직접 입력':'음식 이름으로 직접 찾기'}</Button>}
  <details className={styles.reviewDetails}><summary>사진 보관 · 무료 분석 안내</summary>
  <small>모델 다운로드 없이 서버에서 분석해요. 무료 베타에는 계정별 일일 한도와 서비스 전체 일일·월간 한도가 있어요. 실패한 요청도 횟수에 포함될 수 있으며 한도는 한국 시간 기준으로 갱신돼요. 분석 시 사진의 위치 정보는 제거해요. 사진은 이 기기에 임시 보관되고, 최종 저장하면 내 일기에 함께 보관돼요.</small></details>
 </section>;
}
