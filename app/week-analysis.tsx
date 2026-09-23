'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import {planDate} from '../lib/daily-plan';
import {EXTRA_PREFIX} from '../lib/intake-extras';
import type {BodyProfile} from '../lib/body-profile';
import type {NutritionTarget} from '../lib/nutrition-target';
import {actualByDay,analyzeWeek,KCAL_PER_KG,type ActualLog,type NutrientKey,type NutrientStatus} from '../lib/week-analysis';
import {useHomePlan} from './use-home-plan';
import {WeekPlanModal} from './week-plan-modal';
import './week-analysis.css';

const n=(v:number)=>Math.round(v).toLocaleString('ko-KR');
const kg=(v:number)=>`${v<0?'−':'+'}${Math.abs(v).toFixed(1)}kg`;
const nutrientInfo:Record<NutrientKey,{label:string;unit:string;low:string;high:string}>={
 protein:{label:'단백질',unit:'g',low:'달걀·두부·닭가슴살 같은 단백질 반찬을 한 가지 더해 보세요.',high:'단백질이 넉넉해요. 물을 충분히 마셔 주세요.'},
 carbs:{label:'탄수화물',unit:'g',low:'밥·고구마·오트밀을 조금 더하면 에너지가 안정돼요.',high:'밥 양을 조금 줄이고 채소 반찬으로 채워 보세요.'},
 fat:{label:'지방',unit:'g',low:'견과류 한 줌이나 올리브유를 약간 더해 보세요.',high:'튀김·가공육 메뉴를 줄이면 금방 맞출 수 있어요.'},
 sodium:{label:'나트륨',unit:'mg',low:'',high:'국물은 덜 먹고, 소스는 찍어 먹는 방식으로 바꿔 보세요.'},
};
const statusText:Record<NutrientStatus,[string,string]>={low:['▼','부족'],ok:['✓','적당'],high:['▲','많음']};

export function WeekAnalysis({userId,profile,target,onOpenInfo}:{userId?:string;profile:BodyProfile|null;target:NutritionTarget|null;onOpenInfo:()=>void}){
 const {plan,loading,error,reload}=useHomePlan(userId);
 const [picked,setPicked]=useState(0);
 const [showPlan,setShowPlan]=useState(false);
 const [today]=useState(()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10));
 const [logs,setLogs]=useState<ActualLog[]>([]);
 const start=plan?.conditions.startDate??today;
 const dayCount=plan?.conditions.days??0;
 useEffect(()=>{
  if(!userId||!plan||!dayCount)return;
  const controller=new AbortController();
  const to=planDate(start,dayCount);
  fetch(`/api/food-intake?from=${start}&to=${to<today?to:today}`,{cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.json():null).then(d=>{if(d&&!controller.signal.aborted)setLogs(d.logs);}).catch(()=>{});
  return()=>controller.abort();
 },[userId,plan,start,dayCount,today]);
 if(loading)return <section className="week-analysis" aria-busy="true"><div className="week-skeleton"/></section>;
 if(error)return <section className="week-analysis"><p className="auth-error" role="alert">{error} <button type="button" onClick={reload}>다시 불러오기</button></p></section>;
 if(!profile)return <section className="week-analysis is-empty"><strong>식단 분석을 준비하고 있어요</strong><p>내 정보를 입력하면 이번 식단으로 체중이 어떻게 바뀔지, 부족한 영양소는 무엇인지 알려드려요.</p><button type="button" className="wizard-next" onClick={onOpenInfo}>내 정보 입력하기</button></section>;
 if(profile.pregnancy)return null;
 if(!plan)return <section className="week-analysis is-empty"><strong>분석할 식단이 아직 없어요</strong><p>홈에서 식단을 추천받으면 매일 칼로리와 예상 체중 변화, 부족한 영양소를 분석해 드려요.</p><Link className="wizard-next" href="/">홈에서 식단 추천받기</Link></section>;
 const a=analyzeWeek({...plan,profile,target});
 if(!a)return null;

 const dates=a.days.map(d=>planDate(start,d.day));
 const actual=actualByDay(a,logs,dates,profile.meals,EXTRA_PREFIX);
 const loggedDays=actual.filter((x):x is NonNullable<typeof x>=>x!==null);
 const actualAvg=loggedDays.length?Math.round(loggedDays.reduce((sum,x)=>sum+x.intake,0)/loggedDays.length):null;
 const actualWeekKg=actualAvg===null?null:(actualAvg-a.maintenance)*7/KCAL_PER_KG;
 const flat=Math.abs(a.weekKg)<0.05;
 const direction=flat?'유지':a.weekKg<0?'감량':'증량';
 const max=Math.max(a.maintenance,...a.days.map(d=>d.intake),...loggedDays.map(x=>x.intake))*1.12;
 const day=a.days[Math.min(picked,a.days.length-1)];
 const issues=a.nutrients.filter(x=>x.status&&x.status!=='ok');
 const worst=[...issues].sort((x,y)=>Math.abs((y.percent??100)-100)-Math.abs((x.percent??100)-100))[0];

 return <section className="week-analysis" aria-label="이번 식단 분석">
  <header><div><span className="week-kicker">이번 식단 분석</span><h3>{a.days.length}일 식단으로 예상해 봤어요</h3></div><button type="button" className="week-open-plan" aria-haspopup="dialog" onClick={()=>setShowPlan(true)}>식단 보기</button></header>
  <WeekPlanModal open={showPlan} onClose={()=>setShowPlan(false)} analysis={a} startDate={plan.conditions.startDate??today}/>

  <div className={`week-hero is-${flat?'flat':a.weekKg<0?'down':'up'}`}>
   <div className="week-hero-main"><span>1주 예상 체중 변화</span><strong>{flat?'±0.0kg':kg(a.weekKg)}</strong><em><i aria-hidden="true">{flat?'＝':a.weekKg<0?'↘':'↗'}</i>{direction} 예상</em></div>
   <dl>
    <div><dt>하루 평균 섭취</dt><dd>{n(a.avgIntake)}<small>kcal</small></dd></div>
    <div><dt>유지 칼로리 대비</dt><dd>{a.avgDelta>0?'+':a.avgDelta<0?'−':''}{n(Math.abs(a.avgDelta))}<small>kcal/일</small></dd></div>
    <div><dt>이대로 4주면</dt><dd>{Math.abs(a.monthKg)<0.05?'±0.0kg':kg(a.monthKg)}</dd></div>
   </dl>
   {actualAvg!==null&&actualWeekKg!==null&&<p className="week-actual"><b>실제 기록 {loggedDays.length}일</b> 하루 평균 {n(actualAvg)}kcal · 계획보다 {actualAvg-a.avgIntake>=0?`${n(actualAvg-a.avgIntake)} 많게`:`${n(a.avgIntake-actualAvg)} 적게`} · 이 페이스면 1주 {Math.abs(actualWeekKg)<0.05?'±0.0kg':kg(actualWeekKg)}</p>}
  </div>

  <div className="week-chart" aria-label="날짜별 예상 섭취 칼로리">
   <div className="week-chart-legend" aria-hidden="true"><span><i className="is-planned"/>추천 식단</span><span><i className="is-assumed"/>나머지 끼니(목표량 가정)</span>{loggedDays.length>0&&<span><i className="is-actual"/>실제 기록</span>}<span>아래 숫자는 일차</span></div>
   <div className="week-bars" style={{'--cols':a.days.length} as React.CSSProperties}>
    <div className="week-ref" style={{bottom:`${a.maintenance/max*100}%`}}><span>유지 {n(a.maintenance)}</span></div>
    {a.days.map((d,i)=><button type="button" key={d.day} className="week-bar" aria-pressed={d===day} onClick={()=>setPicked(i)}
     aria-label={`${d.day}일차 계획 ${n(d.intake)}kcal${actual[i]?`, 실제 ${n(actual[i]!.intake)}kcal`:''}`}>
     <span className="week-bar-stack" style={{height:`${d.intake/max*100}%`}}>
      {d.assumed>0&&<i className="is-assumed" style={{flexGrow:d.assumed}}/>}
      <i className="is-planned" style={{flexGrow:d.planned}}/>
     </span>
     {actual[i]&&<b className="week-actual-mark" style={{bottom:`${actual[i]!.intake/max*100}%`}} aria-hidden="true"/>}
     <small>{d.day}</small>
    </button>)}
   </div>
   <p className="week-day-note" aria-live="polite"><b>{day.day}일차 {n(day.intake)}kcal</b> · 추천 식단 {n(day.planned)}{day.assumed>0?` + 나머지 끼니 ${n(day.assumed)}`:''} · 유지보다 {day.delta>=0?`${n(day.delta)} 많게`:`${n(-day.delta)} 적게`}{day.unknown>0?` · 칼로리 미확인 ${day.unknown}끼는 목표량으로 계산`:''}{actual[day.day-1]?<> · <b>실제 {n(actual[day.day-1]!.intake)}kcal</b>(기록 {n(actual[day.day-1]!.logged)}{actual[day.day-1]!.assumed?` + 기록 안 한 끼니 ${n(actual[day.day-1]!.assumed)}`:''}) · 계획보다 {actual[day.day-1]!.vsPlan>=0?`${n(actual[day.day-1]!.vsPlan)} 많게`:`${n(-actual[day.day-1]!.vsPlan)} 적게`}</>:dates[day.day-1]<=today?' · 아직 먹은 기록이 없어요':''}</p>
  </div>

  <div className="week-nutrients">
   <h4>영양소 체크 <small>추천 식단 {a.plannedMeals}끼 · 1인분 기준</small></h4>
   {worst&&<p className="week-focus"><b>가장 신경 쓸 부분</b> {nutrientInfo[worst.key].label} {statusText[worst.status!][1]} · {worst.status==='low'?nutrientInfo[worst.key].low:nutrientInfo[worst.key].high}</p>}
   <ul>{a.nutrients.map(x=>{const info=nutrientInfo[x.key];return <li key={x.key} className={x.status?`is-${x.status}`:'is-unknown'}>
    <div className="week-nutrient-head"><strong>{info.label}</strong>{x.status?<span className="week-status"><i aria-hidden="true">{statusText[x.status][0]}</i>{statusText[x.status][1]}</span>:<span className="week-status">정보 부족</span>}</div>
    {x.percent!==null&&<div className="week-meter" role="img" aria-label={`${info.label} 목표의 ${x.percent}%`}><i style={{width:`${Math.min(150,x.percent)/150*100}%`}}/><b style={{left:`${100/150*100}%`}} aria-hidden="true"/></div>}
    <small>{x.perMeal!==null?`한 끼 평균 ${n(x.perMeal)}${info.unit} / ${x.key==='sodium'?'상한':'목표'} ${n(x.goalPerMeal!)}${info.unit} (${x.percent}%)`:'영양정보가 확인된 메뉴가 없어요'}{x.missing>0?` · 미확인 ${x.missing}끼 제외`:''}</small>
   </li>;})}</ul>
  </div>

  <details className="week-method"><summary>어떻게 계산하나요?</summary>
   <p>추천 식단의 1인분 영양정보를 날짜별로 더하고, 식단에 없는 끼니(예: 저녁만 추천받은 날의 아침·점심)는 내 목표 칼로리만큼 먹는다고 가정했어요.</p>
   <p>체중 변화는 유지 칼로리와의 차이를 약 {n(KCAL_PER_KG)}kcal = 1kg으로 환산한 추정이에요. 실제로는 수분·근육량·활동량에 따라 달라지고, 오래 지속할수록 몸이 적응해 변화 폭이 줄어요.</p>
   <p>영양소는 추천 식단의 끼니마다 하루 목표를 끼니 비율로 나눠 비교해요. 나트륨은 2025 한국인 영양소 섭취기준의 만성질환위험감소섭취량을 상한으로 봐요. 의학적 진단이 아니에요.</p>
  </details>
 </section>;
}
