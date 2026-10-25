'use client';

import {useEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import type {IntakeLog} from '../lib/food-intake';
import {eatenTime} from '../lib/meal-time';
import {DetailedNutrition} from './detailed-nutrition';

const value=(n:number|null|undefined,unit:string)=>n==null?'미확인':`${n.toLocaleString('ko-KR',{maximumFractionDigits:1})}${unit}`;
function PhotoViewer({log,index,onClose}:{log:IntakeLog;index:number;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const node=dialog.current;if(!node)return;const trigger=document.activeElement as HTMLElement|null;node.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{node.close();document.body.style.overflow=overflow;trigger?.focus();};},[]);
 return createPortal(<dialog ref={dialog} className="diary-photo-viewer" aria-label={`${log.name} 사진`} onCancel={e=>{e.preventDefault();onClose();}}><header><strong>식사 사진</strong><button type="button" onClick={onClose} autoFocus>닫기</button></header>
 {/* eslint-disable-next-line @next/next/no-img-element -- private authenticated diary image */}
 <img src={`/api/food-intake/photo?id=${log.id}&position=${index}`} alt={log.name}/><p>{log.name}</p></dialog>,document.body);
}
export function DiaryMealCard({log,tools,taiwan=false}:{log:IntakeLog;tools:ReactNode;taiwan?:boolean}){
 const [photo,setPhoto]=useState<number|null>(null),[failed,setFailed]=useState(false);
 const fields=[['carbs','탄수화물','g'],['protein','단백질','g'],['fat','지방','g'],['sugar','당류','g'],['sodium','나트륨','mg']] as const;
 return <article className="diary-meal-card" id={`meal-${log.id}`}>
  <div className="diary-card-overview">
   {log.photoCount&&!failed?<button className="diary-card-photo" type="button" aria-label={`${log.name} 사진 크게 보기`} onClick={()=>setPhoto(0)}>
    {/* eslint-disable-next-line @next/next/no-img-element -- authenticated thumbnail */}
    <img src={`/api/food-intake/photo?id=${log.id}&position=0`} alt={log.name} loading="lazy" onError={()=>setFailed(true)}/>
    {log.photoCount>1&&<span>{log.photoCount}장</span>}
   </button>:<div className="diary-card-no-photo" aria-label={failed?'사진을 불러오지 못했어요':'사진 없는 기록'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="7"/><path d="M2 4v6m3-6v6M2 7h3m-1.5 3v10M22 4v16m0-16c-4 3-4 8 0 8"/></svg></div>}
   <div className="diary-card-copy"><time dateTime={eatenTime(log)}>{new Date(eatenTime(log)).toLocaleTimeString(taiwan?'zh-TW':'ko-KR',{timeZone:taiwan?'Asia/Taipei':'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false})}</time><h5>{log.name}</h5><p><strong>{value(log.calories,'')}</strong><span>{log.calories==null?'':'kcal'}</span><span className="diary-card-portion">{log.productId.startsWith('source-')?'분량 미기록':`${log.portions}회분`}</span></p></div>
  </div>
  <div className="diary-card-footer"><details className="diary-card-nutrition"><summary>영양정보 <span aria-hidden="true">⌄</span></summary><dl>{fields.map(([key,label,unit])=><div key={key}><dt>{label}</dt><dd>{value(log[key],unit)}</dd></div>)}</dl><small>{log.productId.startsWith('photo:')?'사진 분석 추정치예요.':'기록한 양을 기준으로 계산했어요.'} 미확인은 0이 아니에요.</small><DetailedNutrition code={log.productId} historical/>{(log.photoCount??0)>1&&<div className="diary-extra-photos">{Array.from({length:log.photoCount??0},(_,i)=><button type="button" key={i} onClick={()=>setPhoto(i)}>사진 {i+1} 보기</button>)}</div>}</details>{tools}</div>
  {photo!==null&&<PhotoViewer log={log} index={photo} onClose={()=>setPhoto(null)}/>}
 </article>;
}
