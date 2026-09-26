'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import type {PlanProduct} from '../lib/shopping-plan';
import {trackPlanner} from '../lib/track-planner';
import {trackAnalytics} from '../lib/analytics';
import type {useFoodIntake} from './food-intake';
import {MealPhotoLog,PhotoLogSummary,type PhotoLogResult} from './meal-photo-log';
import {SnackLog} from './snack-log';
import {EatLogPanel} from './eat-log-panel';
import {INTAKE_LOGGED_EVENT} from './record-progress';
import './meal-record-accordion.css';

const number=(value:number)=>Math.round(value*10)/10;
export function MealRecordAccordion({intake,userId,onLogin,recommended,initialOpen=false,onRecommendedLogged}:{intake:ReturnType<typeof useFoodIntake>;userId?:string;onLogin:()=>void;recommended?:PlanProduct;initialOpen?:boolean;onRecommendedLogged:()=>void}){
 const router=useRouter();
 const [open,setOpen]=useState(initialOpen);
 const [method,setMethod]=useState<'search'|'recommended'|null>(initialOpen?'recommended':null);
 const [photo,setPhoto]=useState<Extract<PhotoLogResult,{logged:true}>|null>(null);
 const [savedName,setSavedName]=useState('');
 const {totals,current}=intake;
 const owned=recommended?intake.products.find(p=>p.id===recommended.id):undefined;
 const recorded=recommended&&current?.logs.some(log=>log.productId===recommended.id);
 function saved(name:string){setSavedName(name);intake.reload();window.dispatchEvent(new CustomEvent(INTAKE_LOGGED_EVENT));}
 async function undoPhoto(){
  if(!photo)return;
  for(const id of photo.ids)if(!await intake.send({action:'undo',id,version:current?.version??0}))return;
  setPhoto(null);setSavedName('');
 }
 return <details id="meal-record-entry" tabIndex={-1} className="meal-record-accordion" open={open}>
  <summary onClick={event=>{event.preventDefault();setOpen(value=>!value);}}>
   <span className="meal-record-kicker">오늘 한 끼만 가볍게</span>
   <span className="meal-record-title">실제로 먹은 한 끼 기록하기 <span className="meal-record-chevron" aria-hidden="true">⌄</span></span>
   <span className="meal-record-benefit">오늘 먹은 칼로리·단백질을 확인하고,<br/>기록이 쌓이면 내 식사 패턴을 볼 수 있어요.</span>
   <span className="meal-record-permission">추천과 다른 음식도 괜찮아요 · 사진 또는 검색</span>
  </summary>
  <div className="meal-record-body">
   <p className="meal-record-explainer">매 끼니 다 남기지 않아도 돼요. 실제 먹은 음식으로 오늘의 영양을 확인하고, 마이페이지의 주간 리포트에서 기록한 날의 식사를 돌아보세요.</p>
   {!userId?<><button type="button" className="meal-record-login" onClick={onLogin}>로그인하고 오늘 한 끼 남기기</button><small>내 식사 일기에 저장해 날짜별로 다시 볼 수 있어요.</small></>:<>
    <p className="meal-record-today">오늘 먹은 음식 기록 · {intake.today.slice(5).replace('-','/')}</p>
    <MealPhotoLog dishName="실제로 먹은 음식" buttonLabel="사진으로 기록" manualLabel="음식 검색으로 기록" disabled={intake.disabled} onManual={()=>{setMethod('search');trackAnalytics('record_method_selected',{method:'search'});}} onFallback={()=>setMethod('search')} onLogged={result=>{setPhoto(result);setMethod(null);saved(result.food?.name??'사진 속 음식');trackPlanner('photo_logged');}}/>
    <p className="meal-record-method-hint">집밥·외식·간식·음료, 무엇을 먹었든 남길 수 있어요.</p>
    {recommended&&!recorded&&<button type="button" className="meal-record-recommended" disabled={intake.disabled} aria-expanded={method==='recommended'} onClick={()=>setMethod(method==='recommended'?null:'recommended')}><strong>추천 메뉴 먹었어요</strong><small>{recommended.name.replace(/_/g,' · ')} · 먹은 양 선택</small></button>}
    {recorded&&<p className="meal-record-method-hint">이 추천 메뉴는 오늘 기록했어요. 다른 음식은 사진이나 검색으로 더 남길 수 있어요.</p>}
    {method==='search'&&<SnackLog initialOpen onClose={()=>setMethod(null)} onLogged={name=>{setMethod(null);setPhoto(null);saved(name);}}/>}
    {method==='recommended'&&recommended&&!recorded&&<EatLogPanel key={recommended.id} product={recommended} title={`${recommended.name.replace(/_/g,' · ')} · 얼마나 먹었어요?`} stockAvailable={owned?.available??0} disabled={intake.disabled} onClose={()=>setMethod(null)} onSubmit={({portions,extras,deduct})=>{void intake.log(recommended.id,portions,extras,deduct?owned:undefined).then(ok=>{if(ok){setMethod(null);setPhoto(null);saved(recommended.name.replace(/_/g,' · '));onRecommendedLogged();}});}}/>}
    {photo&&<PhotoLogSummary result={photo} streak={null} busy={intake.disabled} onUndo={()=>void undoPhoto()} onEdit={()=>router.push('/record#meal-history')}/>}
    {savedName&&<div className="meal-record-feedback" role="status"><strong>{savedName} · 오늘 기록에 남겼어요</strong>{intake.loading?<p>오늘 영양 합계를 업데이트하고 있어요…</p>:intake.error?<p>기록은 저장됐어요. 오늘 합계는 다시 불러와 주세요.</p>:totals&&<><p>오늘 기록한 영양 <b>{current?.logs.some(log=>log.calories!==null)?`${number(totals.calories).toLocaleString('ko-KR')} kcal`:'칼로리 미확인'}</b> · 단백질 <b>{current?.logs.some(log=>log.protein!==null)?`${number(totals.protein)} g`:'미확인'}</b></p><small>기록한 음식만 합산한 값이에요. 사진 분석은 추정치이며, 미확인 영양정보는 제외돼요.</small></>}<Link href="/record#meal-history">방금 기록한 식사 확인·수정 →</Link></div>}
   </>}
  </div>
 </details>;
}
