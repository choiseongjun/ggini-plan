'use client';
/* eslint-disable @next/next/no-img-element -- local user-selected image preview */
import {useEffect,useRef,useState} from 'react';
import type {PhotoFood} from '../lib/meal-photo-ai';
import './plan-photo-input.css';
import {shrink} from './meal-photo-log';
export function PlanPhotoInput({onFood,onBusy,onReset,userId,onLogin}:{onReset:()=>void;onFood:(food:PhotoFood)=>void;onBusy:(busy:boolean)=>void;userId?:string;onLogin:()=>void}){
 const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const picker=useRef<HTMLInputElement>(null);
 const controller=useRef<AbortController|null>(null),locked=useRef(false);
 useEffect(()=>{if(!file)return;const url=URL.createObjectURL(file);const frame=requestAnimationFrame(()=>setPreview(url));return()=>{cancelAnimationFrame(frame);URL.revokeObjectURL(url);};},[file]);
 useEffect(()=>()=>controller.current?.abort(),[]);
 async function analyze(){if(!file||!consent||locked.current)return;if(!userId){onLogin();return;}locked.current=true;setBusy(true);onBusy(true);setError('');const c=new AbortController();controller.current=c;const timer=setTimeout(()=>c.abort(),45000);
 try{const bytes=await shrink(file);if(bytes.size>8*1024*1024)throw Error('사진은 8MB 이하로 선택해 주세요.');const form=new FormData();form.set('photo',bytes,file.name);form.set('consent','yes');const r=await fetch('/api/manual-meal-plans/analyze',{method:'POST',body:form,signal:c.signal});const d=await r.json();if(!r.ok)throw Error(d.error);onFood(d.food);}catch(e){setError(c.signal.aborted?'분석 시간이 오래 걸려 멈췄어요. 다시 시도해 주세요.':e instanceof Error?e.message:'사진을 분석하지 못했어요.');}finally{clearTimeout(timer);locked.current=false;setBusy(false);onBusy(false);}}
 return <div className="plan-photo-input">
  <header><span className="plan-photo-step">1</span><div><h4>음식 사진을 올려주세요</h4><p>음식이 잘 보이는 사진 한 장이면 돼요.</p></div></header>
  <input ref={picker} type="file" accept="image/*" hidden disabled={busy} onChange={e=>{const next=e.target.files?.[0];if(!next)return;setFile(next);setPreview('');setError('');onReset();e.target.value='';}}/>
  <button className={`plan-photo-picker${preview?' has-photo':''}`} type="button" disabled={busy} onClick={()=>picker.current?.click()} aria-label={file?'음식 사진 바꾸기':'촬영하거나 앨범에서 음식 사진 선택'}>
   {preview?<><img src={preview} alt="선택한 음식 사진"/><span className="plan-photo-change">사진 바꾸기</span></>:<><span className="plan-photo-camera" aria-hidden="true"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m8 6 2-3h4l2 3h3a2 2 0 0 1 2 2v11H3V8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12" r="3.5"/></svg></span><strong>음식 사진 선택</strong><small>촬영하거나 앨범에서 골라주세요</small></>}
  </button>
  <div className="plan-photo-notice"><p>AI가 음식 이름과 영양을 추정해요.<br/>결과를 확인한 뒤 식단에 저장할 수 있어요.</p><details><summary>사진은 어떻게 처리하나요?</summary><p>사진은 AI 분석을 위해 전송되며 원본은 끼니플랜에 저장하지 않아요. <a href="/privacy#meal-photos" target="_blank" rel="noreferrer">사진 처리 안내 보기</a></p></details></div>
  <label className="plan-photo-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/><span><strong>AI 사진 분석에 동의해요</strong><small>선택한 사진을 분석을 위해 전송합니다.</small></span></label>
  <button className="plan-photo-analyze" type="button" disabled={busy||!file||!consent} onClick={()=>void analyze()}>{busy?'사진을 분석하고 있어요…':userId?'이 사진 분석하기':'로그인하고 분석하기'}</button>
  {!busy&&(!file||!consent)&&<p className="plan-photo-next">{!file?'먼저 음식 사진을 선택해 주세요.':'위 동의 항목을 체크하면 분석할 수 있어요.'}</p>}
  {busy&&<p role="status" className="plan-photo-next">완료되면 아래에서 메뉴 이름을 확인할 수 있어요.</p>}
  {error&&<p className="plan-photo-error" role="alert">{error}</p>}
 </div>;
}
