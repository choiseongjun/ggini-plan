'use client';

import {mealTimeLocal,inferredMealSlot,type MealSlot} from '../lib/meal-time';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {trackPlanner} from '../lib/track-planner';
import {trackAnalytics} from '../lib/analytics';
import type {useFoodIntake} from './food-intake';
import {MealPhotoLog,PhotoLogSummary,type PhotoLogResult} from './meal-photo-log';
import {SnackLog} from './snack-log';
import {INTAKE_LOGGED_EVENT} from './record-progress';
import './meal-record-accordion.css';

const number=(value:number)=>Math.round(value*10)/10;
export function MealRecordAccordion({intake,userId,onLogin,initialOpen=false,expanded,onExpandedChange}:{intake:ReturnType<typeof useFoodIntake>;userId?:string;onLogin:()=>void;initialOpen?:boolean;expanded?:boolean;onExpandedChange?:(value:boolean)=>void}){
 const router=useRouter();
 const [localOpen,setLocalOpen]=useState(initialOpen);
 const open=expanded??localOpen;
 const setOpen=(value:boolean)=>{setLocalOpen(value);onExpandedChange?.(value);};
 const [mealTime,setMealTime]=useState('');
 const [mealSlot,setMealSlot]=useState<MealSlot|null>(()=>inferredMealSlot(new Date().toISOString()));
 const [searchBusy,setSearchBusy]=useState(false);
 const timeSelection={value:mealTime,slot:mealSlot,onChange:setMealTime,onSlotChange:setMealSlot};
 const [method,setMethod]=useState<'search'|null>(null);
 const [photo,setPhoto]=useState<Extract<PhotoLogResult,{logged:true}>|null>(null);
 const [savedDate,setSavedDate]=useState('');
 const [savedName,setSavedName]=useState('');
 const {totals,current}=intake;
 function saved(name:string,eatenAt?:string){setSavedDate(eatenAt?mealTimeLocal(eatenAt).slice(0,10):intake.today);setSavedName(name);intake.reload();window.dispatchEvent(new CustomEvent(INTAKE_LOGGED_EVENT));}
 async function undoPhoto(){
  if(!photo)return;
  for(const id of photo.ids)if(!await intake.send({action:'undo',id,version:current?.version??0}))return;
  setPhoto(null);setSavedName('');
 }
 return <details id="meal-record-entry" tabIndex={-1} className="meal-record-accordion" open={open}>
  <summary onClick={event=>{event.preventDefault();setOpen(!open);}}>
   <span className="meal-record-title">한 끼 기록하기 <span className="meal-record-chevron" aria-hidden="true">⌄</span></span>
   <span className="meal-record-permission">사진 또는 음식 검색</span>
  </summary>
  <div className="meal-record-body">
   {!userId?<><button type="button" className="meal-record-login" onClick={onLogin}>로그인하고 기록하기</button></>:<>
    <MealPhotoLog timeSelection={timeSelection} dishName="실제로 먹은 음식" buttonLabel="사진으로 기록" manualLabel="음식 검색으로 기록" disabled={intake.disabled||searchBusy} onManual={()=>{setMethod('search');trackAnalytics('record_method_selected',{method:'search'});}} onFallback={()=>setMethod('search')} onLogged={result=>{setPhoto(result);setMethod(null);saved(result.food?.name??'사진 속 음식',result.eatenAt);trackPlanner('photo_logged');}}/>
    {method==='search'&&<SnackLog initialOpen timeSelection={timeSelection} onBusyChange={setSearchBusy} onClose={()=>setMethod(null)} onLogged={(name,eatenAt)=>{setMethod(null);setPhoto(null);saved(name,eatenAt);}}/>}
    {photo&&<PhotoLogSummary result={photo} streak={null} busy={intake.disabled} onUndo={()=>void undoPhoto()} onEdit={()=>router.push(`/record?date=${savedDate||intake.today}#meal-history`)}/>}
    {savedName&&<div className="meal-record-feedback" role="status"><strong>{savedName} · {savedDate===intake.today?'오늘':savedDate} 기록에 남겼어요</strong>{savedDate!==intake.today?<p>먹은 날짜의 식사 일기와 주간 리포트에 반영했어요.</p>:intake.loading?<p>오늘 영양 합계를 업데이트하고 있어요…</p>:intake.error?<p>기록은 저장됐어요. 오늘 합계는 다시 불러와 주세요.</p>:totals&&<><p>오늘 기록한 영양 <b>{current?.logs.some(log=>log.calories!==null)?`${number(totals.calories).toLocaleString('ko-KR')} kcal`:'칼로리 미확인'}</b> · 단백질 <b>{current?.logs.some(log=>log.protein!==null)?`${number(totals.protein)} g`:'미확인'}</b></p><small>기록한 음식만 합산한 값이에요. 사진 분석은 추정치이며, 미확인 영양정보는 제외돼요.</small></>}<Link href={`/record?date=${savedDate}#meal-history`}>방금 기록한 식사 확인·수정 →</Link></div>}
   </>}
  </div>
 </details>;
}
