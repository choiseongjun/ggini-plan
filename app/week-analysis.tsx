'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {planDate} from '../lib/daily-plan';
import {mealSchedule} from '../lib/shopping-plan';

import type {BodyProfile} from '../lib/body-profile';
import type {NutritionTarget} from '../lib/nutrition-target';
import {actualByDay,analyzeWeek,type ActualLog,type NutrientKey,type NutrientStatus} from '../lib/week-analysis';
import {useHomePlan} from './use-home-plan';
import {WeekPlanModal} from './week-plan-modal';
import './week-analysis.css';

const n=(v:number)=>Math.round(v).toLocaleString('ko-KR');
const nutrientInfo:Record<NutrientKey,{label:string;unit:string}>={protein:{label:'단백질',unit:'g'},carbs:{label:'탄수화물',unit:'g'},fat:{label:'지방',unit:'g'},sodium:{label:'나트륨',unit:'mg'}};
const statusText:Record<NutrientStatus,[string,string]>={low:['▼','비교 기준보다 낮음'],ok:['·','비교 범위 안'],high:['▲','비교 기준보다 높음']};
const signed=(v:number)=>`${v<0?'−':v>0?'+':''}${n(Math.abs(v))}`;
export function WeekAnalysis({userId,profile,target,onOpenInfo}:{userId?:string;profile:BodyProfile|null;target:NutritionTarget|null;onOpenInfo:()=>void}){
 const {plan,loading,error,reload}=useHomePlan(userId);
 const [picked,setPicked]=useState(0);
 const [showPlan,setShowPlan]=useState(false);
 const [today,setToday]=useState(()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}));
 const [logState,setLogState]=useState<{key:string;logs:ActualLog[];error:string;loading:boolean}>({key:'',logs:[],error:'',loading:true});
 const start=plan?.conditions.startDate??today;
 const dayCount=plan?Math.max(0,...mealSchedule(plan.conditions).map(s=>s.day)):0;
 const rangeKey=`${userId??'guest'}|${start}|${dayCount}|${today}`;
 const logs=logState.key===rangeKey?logState.logs:[];
 useEffect(()=>{
  const tick=()=>setToday(new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}));
  const timer=setInterval(tick,60000);document.addEventListener('visibilitychange',tick);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick);};
 },[]);
 useEffect(()=>{
  if(!userId||!dayCount||start>today)return;
  let alive=true,revision=0;let controller:AbortController|undefined;
  const load=async()=>{
   const request=++revision;controller?.abort();controller=new AbortController();
   setLogState({key:rangeKey,logs:[],error:'',loading:true});
   try{
    const end=planDate(start,dayCount),to=end<today?end:today;
    const response=await fetch(`/api/food-intake?from=${start}&to=${to}`,{cache:'no-store',signal:controller.signal});
    if(!response.ok)throw new Error('먹은 기록을 불러오지 못했어요.');
    const data=await response.json();if(!Array.isArray(data.logs))throw new Error('기록 응답을 확인하지 못했어요.');
    if(alive&&request===revision)setLogState({key:rangeKey,logs:data.logs,error:'',loading:false});
   }catch(e){if(alive&&request===revision)setLogState({key:rangeKey,logs:[],error:e instanceof Error?e.message:'기록을 불러오지 못했어요.',loading:false});}
  };
  const changed=(e:Event)=>{if(e.type==='intake-logged'||(e as CustomEvent).detail?.source==='intake')void load();};
  const visible=()=>{if(!document.hidden)void load();};
  void load();window.addEventListener('intake-logged',changed);window.addEventListener('shopping-progress-changed',changed);document.addEventListener('visibilitychange',visible);
  return()=>{alive=false;controller?.abort();window.removeEventListener('intake-logged',changed);window.removeEventListener('shopping-progress-changed',changed);document.removeEventListener('visibilitychange',visible);};
 },[userId,start,dayCount,today,rangeKey,plan]); if(loading)return <section className="week-analysis" aria-busy="true"><div className="week-skeleton"/></section>;
 if(error)return <section className="week-analysis"><p className="auth-error" role="alert">{error} <button type="button" onClick={reload}>다시 불러오기</button></p></section>;
 if(!profile)return <section className="week-analysis is-empty"><strong>식단 분석을 준비하고 있어요</strong><p>내 정보를 입력하면 추천 식단의 열량과 영양소를 내 비교 기준과 함께 볼 수 있어요.</p><button type="button" className="wizard-next" onClick={onOpenInfo}>내 정보 입력하기</button></section>;
 if(profile.pregnancy)return null;
 if(!plan)return <section className="week-analysis is-empty"><strong>분석할 식단이 아직 없어요</strong><p>홈에서 식단을 추천받으면 일별 열량과 영양소를 비교해 드려요.</p><Link className="wizard-next" href="/">홈에서 식단 추천받기</Link></section>;
 const a=analyzeWeek({...plan,profile,target});
 if(!a)return <section className="week-analysis"><p>식단의 메뉴 정보를 모두 확인하지 못해 분석을 표시할 수 없어요.</p><button type="button" onClick={reload}>다시 불러오기</button></section>;

 const dates=a.days.map(d=>planDate(start,d.day));
 const actual=actualByDay(a,logs,dates);
 const loggedDays=actual.filter((x):x is NonNullable<typeof x>=>x!==null);
 const actualAvg=loggedDays.length?Math.round(loggedDays.reduce((sum,x)=>sum+x.intake,0)/loggedDays.length):null;
 const max=Math.max(a.maintenance,...a.days.map(d=>d.intake),...loggedDays.map(x=>x.intake))*1.12;
 const day=a.days[Math.min(picked,a.days.length-1)];
 return <section className="week-analysis" aria-label="이번 식단 분석">
  <header><div><span className="week-kicker">이번 식단 분석</span><h3>현재 {a.days.length}일 식단 분석</h3></div><button type="button" className="week-open-plan" aria-haspopup="dialog" onClick={()=>setShowPlan(true)}>식단 보기</button></header>
  <p className="week-assumptions">메뉴를 바꾸면 추천 식단 분석이, 사진·직접 기록을 저장하거나 취소하면 기록된 열량이 갱신돼요.</p>
  {userId&&start<=today&&(logState.key!==rangeKey||logState.loading)?<p role="status">먹은 기록 갱신 중…</p>:logState.key===rangeKey&&logState.error?<p role="alert">{logState.error} <button type="button" onClick={reload}>다시 불러오기</button></p>:null}
  <WeekPlanModal open={showPlan} onClose={()=>setShowPlan(false)} analysis={a} startDate={plan.conditions.startDate??today}/>

  <div className="week-hero">
   <div className="week-hero-main"><span>추정 유지 칼로리와 하루 평균 차이</span><strong>{signed(a.avgDelta)}<small> kcal/일</small></strong></div>
   <dl>
    <div><dt>식단 기준 하루 평균</dt><dd>{n(a.avgIntake)}<small>kcal</small></dd></div>
    <div><dt>추정 유지 칼로리</dt><dd>{n(a.maintenance)}<small>kcal/일</small></dd></div>
    <div><dt>{a.days.length}일간 열량 차이 합계</dt><dd>{signed(a.totalDelta)}<small>kcal</small></dd></div>
   </dl>
   <p className="week-assumptions">추천 식단 {a.days.length}일을 기준으로 계산했어요. 유지 칼로리는 신체 정보와 활동량으로 추정하며, 이 차이가 실제 감량·증량을 뜻하지는 않아요.</p>
   <p className="week-assumptions">목표량으로 가정한 나머지 끼니 {a.assumedMeals}끼 · 칼로리 미확인으로 목표량을 넣은 메뉴 {a.unknownMeals}끼 · 추정 영양정보 포함 메뉴 {a.estimatedMeals}끼</p>
   {actualAvg!==null&&<p className="week-actual"><b>기록이 있는 {loggedDays.length}일</b> 기록된 열량 평균 {n(actualAvg)}kcal · 미기록 끼니는 포함하지 않았으며 하루 전체 섭취량이 아닐 수 있어요.</p>}
  </div>
  <div className="week-chart" aria-label="날짜별 예상 섭취 칼로리">
   <div className="week-chart-legend" aria-hidden="true"><span><i className="is-planned"/>추천 식단</span><span><i className="is-assumed"/>나머지 끼니(목표량 가정)</span>{loggedDays.length>0&&<span><i className="is-actual"/>기록된 열량</span>}<span>아래 숫자는 일차</span></div>
   <div className="week-bars" style={{'--cols':a.days.length} as React.CSSProperties}>
    <div className="week-ref" style={{bottom:`${a.maintenance/max*100}%`}}><span>추정 유지 {n(a.maintenance)}</span></div>
    {a.days.map((d,i)=><button type="button" key={d.day} className="week-bar" aria-pressed={d===day} onClick={()=>setPicked(i)}
     aria-label={`${d.day}일차 계획 ${n(d.intake)}kcal${actual[i]?`, 기록된 열량 ${n(actual[i]!.intake)}kcal`:''}`}>
     <span className="week-bar-stack" style={{height:`${d.intake/max*100}%`}}>
      {d.assumed>0&&<i className="is-assumed" style={{flexGrow:d.assumed}}/>}
      <i className="is-planned" style={{flexGrow:d.planned}}/>
     </span>
     {actual[i]&&<b className="week-actual-mark" style={{bottom:`${actual[i]!.intake/max*100}%`}} aria-hidden="true"/>}
     <small>{d.day}</small>
    </button>)}
   </div>
   <p className="week-day-note" aria-live="polite"><b>{day.day}일차 {n(day.intake)}kcal</b> · 추천 식단 {n(day.planned)}{day.assumed>0?` + 나머지 끼니 ${n(day.assumed)}`:''} · 유지보다 {day.delta>=0?`${n(day.delta)} 많게`:`${n(-day.delta)} 적게`}{day.unknown>0?` · 칼로리 미확인 ${day.unknown}끼는 목표량으로 계산`:''}{actual[day.day-1]?<> · <b>기록된 열량 {n(actual[day.day-1]!.logged)}kcal</b>{actual[day.day-1]!.protein!==null&&<> · 기록된 단백질 {actual[day.day-1]!.protein}g{actual[day.day-1]!.proteinMissing>0?` (미확인 ${actual[day.day-1]!.proteinMissing}건 제외)`:''}</>} · 미확인 {actual[day.day-1]!.unknown}건 제외 · 미기록 끼니 제외</>:dates[day.day-1]<=today&&logState.key===rangeKey&&!logState.loading&&!logState.error?' · 아직 먹은 기록이 없어요':''}</p>
  </div>

  <div className="week-nutrients">
   <h4>영양소 체크 <small>추천 식단 {a.plannedMeals}끼 · 1인분 기준</small></h4>
   <p className="week-assumptions">비교 기준 대비 수치이며 영양 결핍·과잉 판정이 아니에요. 단백질 기준은 섭취 상한이 아닙니다.</p>
   <ul>{a.nutrients.map(x=>{const info=nutrientInfo[x.key];return <li key={x.key} className={x.status?`is-${x.status}`:'is-unknown'}>
    <div className="week-nutrient-head"><strong>{info.label}</strong>{x.status?<span className="week-status"><i aria-hidden="true">{statusText[x.status][0]}</i>{x.key==='sodium'?(x.status==='high'?'비교 기준 초과':'비교 기준 이하'):statusText[x.status][1]}</span>:<span className="week-status">정보 부족</span>}</div>
    {x.percent!==null&&<div className="week-meter" role="img" aria-label={`${info.label} 비교 기준의 ${x.percent}%`}><i style={{width:`${Math.min(150,x.percent)/150*100}%`}}/><b style={{left:`${100/150*100}%`}} aria-hidden="true"/></div>}
    <small>{x.perMeal!==null?`한 끼 평균 ${n(x.perMeal)}${info.unit} / ${x.key==='sodium'?'위험감소 기준':target?'설정 목표':'참고 기준'} ${n(x.goalPerMeal!)}${info.unit}${x.percent===null?' · 비율 계산 제외':` (${x.percent}%)`}`:'영양정보가 확인된 메뉴가 없어요'}{x.missing>0?` · 미확인 ${x.missing}끼 제외`:''}</small>
   </li>;})}</ul>
  </div>

  <details className="week-method"><summary>어떻게 계산하나요?</summary>
   <p>추천 식단의 1인분 영양정보를 날짜별로 더하고, 식단에 없는 끼니(예: 저녁만 추천받은 날의 아침·점심)는 내 목표 칼로리만큼 먹는다고 가정했어요.</p>
   <p>유지 칼로리는 Mifflin–St Jeor 식에 활동계수를 곱한 추정치예요. 표시된 식단 기간의 열량만 비교하며, 7일·28일로 연장하거나 체중 kg으로 환산하지 않아요.</p>
   <p>설정 목표가 있으면 그 탄단지 비율을 사용하고, 없으면 단백질은 연령·성별 권장량, 탄수화물·지방은 참고 범위의 중간값을 사용해요. 화면의 낮음·범위 안·높음은 비교값의 80% 미만·80~125%·125% 초과라는 서비스 표시 기준이에요. 의학적 기준이 아니며, 영양정보가 있는 메뉴만 비교해요. 비교값이 0이면 비율을 표시하지 않아요.</p>
   <p>나트륨은 만성질환위험감소섭취량을 끼니 비율로 나눠 비교해요. 이를 안전한 섭취 상한이나 개인의 질환 판정으로 해석하지 마세요.</p>  </details>
 </section>;
}
