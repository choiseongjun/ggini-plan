'use client';

import {useEffect,useRef,useState} from 'react';
import {intakeExtras,type IntakeExtra} from '../lib/intake-extras';
import './meal-photo-log.css';

export type PhotoLogResult={logged:true;portion:number;extras:IntakeExtra[];note:string;ids:string[];calories:number}|{logged:false;match:string;note:string};
// Phone photos are 3–8MB (HEIC on iPhone); uploading them over mobile data was the slow part.
// Downscale on the device to what the server sends the model anyway (≤1024px JPEG, ~150KB).
async function shrink(file:File):Promise<Blob>{
 try{
  const bitmap=await createImageBitmap(file);
  const scale=Math.min(1,1024/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',0.82));
  return blob??file;
 }catch{return file;}
}
const MAX_PHOTOS=4;
const stageText={prepare:'사진 준비 중',upload:'사진 올리는 중',analyze:'얼마나 먹었는지 보는 중'} as const;
const portionText=(p:number)=>p===1?'1인분':p===0.5?'반 인분':`${p}인분`;

// 📷 먹었어요: pick or take a photo, the server judges portion + visible sides against the planned dish and logs it.
export function MealPhotoLog({productId,referenceCode,dishName,disabled,onLogged,onFallback,onManual}:{productId?:string;referenceCode?:string;dishName:string;disabled:boolean;onLogged:(result:Extract<PhotoLogResult,{logged:true}>)=>void;onFallback:()=>void;onManual:()=>void}){
 const input=useRef<HTMLInputElement>(null);
 const [picked,setPicked]=useState<{file:File;url:string}[]>([]);
 const pickedRef=useRef(picked);
 useEffect(()=>{pickedRef.current=picked;},[picked]);
 useEffect(()=>()=>{for(const p of pickedRef.current)URL.revokeObjectURL(p.url);},[]);
 const addFiles=(files:FileList|null)=>{if(!files?.length)return;setError('');setResult(null);setPicked(list=>[...list,...[...files].slice(0,MAX_PHOTOS-list.length).map(file=>({file,url:URL.createObjectURL(file)}))]);};
 const removeAt=(i:number)=>setPicked(list=>{URL.revokeObjectURL(list[i].url);return list.filter((_,j)=>j!==i);});
 const clearPicked=()=>setPicked(list=>{for(const p of list)URL.revokeObjectURL(p.url);return [];});
 const [stage,setStage]=useState<keyof typeof stageText|null>(null),[error,setError]=useState(''),[result,setResult]=useState<PhotoLogResult|null>(null);
 async function upload(files:File[]){
  setStage('prepare');setError('');setResult(null);
  const controller=new AbortController(),timer=window.setTimeout(()=>controller.abort(),40000);
  try{
   const photos=await Promise.all(files.map(shrink));
   const form=new FormData();photos.forEach((photo,i)=>form.append('photo',photo,`meal-${i+1}.jpg`));if(referenceCode)form.set('referenceCode',referenceCode);else form.set('productId',productId??'');form.set('id',crypto.randomUUID());
   setStage('upload');
   const request=fetch('/api/food-intake/photo',{method:'POST',body:form,signal:controller.signal});
   // The upload is small now, so after a moment the wait is the analysis itself.
   const analyzing=window.setTimeout(()=>setStage(current=>current==='upload'?'analyze':current),1200);
   const r=await request.finally(()=>window.clearTimeout(analyzing));
   const d=await r.json().catch(()=>({error:'사진을 분석하지 못했어요. 다시 시도해 주세요.'}));
   if(!r.ok)throw new Error(d.error??'사진을 분석하지 못했어요.');
   if(d.logged){clearPicked();onLogged(d);}else setResult(d);
  }catch(e){setError(controller.signal.aborted?'시간이 오래 걸려 멈췄어요. 연결을 확인하고 다시 시도해 주세요.':e instanceof Error?e.message:'사진을 분석하지 못했어요.');}
  finally{window.clearTimeout(timer);setStage(null);if(input.current)input.current.value='';}
 }
 return <div className="photo-log">
  <input ref={input} type="file" accept="image/*" multiple hidden onChange={e=>{addFiles(e.target.files);e.target.value='';}}/>
  {stage?<div className="photo-log-busy" role="status"><span className="photo-log-spinner" aria-hidden="true"/><div><strong>{stageText[stage]}…</strong><small>보통 5초 안팎 걸려요</small></div></div>
  :result&&!result.logged?<div className="photo-log-mismatch" role="status"><strong>{result.match==='different'?`${dishName}와(과) 달라 보여요`:'사진을 잘 알아보지 못했어요'}</strong>{result.note&&<small>{result.note}</small>}<div><button type="button" onClick={()=>{setResult(null);clearPicked();input.current?.click();}}>다시 찍기</button><button type="button" onClick={()=>{setResult(null);clearPicked();onFallback();}}>그래도 1인분으로 기록</button></div></div>
  :picked.length?<div className="photo-log-staged">
   <ul className="photo-log-thumbs">{picked.map((p,i)=><li key={p.url}>
    {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview, nothing to optimise */}
    <img src={p.url} alt={`먹은 사진 ${i+1}`}/><button type="button" aria-label={`사진 ${i+1} 빼기`} onClick={()=>removeAt(i)}>✕</button></li>)}
    {picked.length<MAX_PHOTOS&&<li><button type="button" className="photo-log-add" onClick={()=>input.current?.click()}><span aria-hidden="true">+</span>추가</button></li>}</ul>
   <small className="photo-log-hint">먹기 전·후 사진이나 반찬을 따로 찍은 사진을 함께 올리면 더 정확해요 (최대 {MAX_PHOTOS}장)</small>
   <div className="photo-log-staged-actions"><button type="button" onClick={clearPicked}>취소</button><button type="button" className="photo-log-submit" disabled={disabled} onClick={()=>void upload(picked.map(p=>p.file))}>기록하기 ({picked.length}장)</button></div>
  </div>
  :<><button type="button" className="photo-log-button" disabled={disabled} onClick={()=>input.current?.click()}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.3l1.4-2h5.6l1.4 2h1.3A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5Z"/><circle cx="12" cy="12.5" r="3.4"/></svg>먹었어요 · 사진 올리기</button>
   <button type="button" className="photo-log-manual" disabled={disabled} onClick={onManual}>사진 없이 기록</button></>}
  {error&&<p className="photo-log-error" role="alert">{error}</p>}
 </div>;
}

export function PhotoLogSummary({result,streak,onUndo,onEdit,busy}:{result:Extract<PhotoLogResult,{logged:true}>;streak:number|null;onUndo:()=>void;onEdit?:()=>void;busy:boolean}){
 return <div className="photo-log-done" role="status">
  <span className="photo-log-check" aria-hidden="true"/>
  <div><strong>{portionText(result.portion)}{result.extras.length?` + ${result.extras.map(k=>intakeExtras[k].label).join(', ')}`:''} · 약 {Math.round(result.calories).toLocaleString('ko-KR')}kcal 기록했어요</strong>{streak!==null&&<span className="photo-log-streak">{streak}일 연속 기록 중!</span>}{result.note&&<small>{result.note}</small>}</div>
  <div className="photo-log-done-actions">{onEdit&&<button type="button" disabled={busy} onClick={onEdit}>수정</button>}<button type="button" disabled={busy} onClick={onUndo}>되돌리기</button></div>
 </div>;
}
