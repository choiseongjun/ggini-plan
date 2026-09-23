'use client';

import Link from 'next/link';
import {useState} from 'react';
import type {BodyProfile} from '../lib/body-profile';
import type {NutritionTarget} from '../lib/nutrition-target';
import {analyzeWeek,KCAL_PER_KG,type NutrientKey,type NutrientStatus} from '../lib/week-analysis';
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
 if(loading)return <section className="week-analysis" aria-busy="true"><div className="week-skeleton"/></section>;
 if(error)return <section className="week-analysis"><p className="auth-error" role="alert">{error} <button type="button" onClick={reload}>다시 불러오기</button></p></section>;
 if(!profile)return <section className="week-analysis is-empty"><strong>식단 분석을 준비하고 있어요</strong><p>내 정보를 입력하면 이번 식단으로 체중이 어떻게 바뀔지, 부족한 영양소는 무엇인지 알려드려요.</p><button type="button" className="wizard-next" onClick={onOpenInfo}>내 정보 입력하기</button></section>;
 if(profile.pregnancy)return null;
 if(!plan)return <section className="week-analysis is-empty"><strong>분석할 식단이 아직 없어요</strong><p>홈에서 식단을 추천받으면 매일 칼로리와 예상 체중 변화, 부족한 영양소를 분석해 드려요.</p><Link className="wizard-next" href="/">홈에서 식단 추천받기</Link></section>;
 const a=analyzeWeek({...plan,profile,target});
 if(!a)return null;

 const flat=Math.abs(a.weekKg)<0.05;
 const direction=flat?'유지':a.weekKg<0?'감량':'증량';
 const max=Math.max(a.maintenance,...a.days.map(d=>d.intake))*1.12;
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
  </div>

  <div className="week-chart" aria-label="날짜별 예상 섭취 칼로리">
   <div className="week-chart-legend" aria-hidden="true"><span><i className="is-planned"/>추천 식단</span><span><i className="is-assumed"/>나머지 끼니(목표량 가정)</span><span>아래 숫자는 일차</span></div>
   <div className="week-bars" style={{'--cols':a.days.length} as React.CSSProperties}>
    <div className="week-ref" style={{bottom:`${a.maintenance/max*100}%`}}><span>유지 {n(a.maintenance)}</span></div>
    {a.days.map((d,i)=><button type="button" key={d.day} className="week-bar" aria-pressed={d===day} onClick={()=>setPicked(i)}
     aria-label={`${d.day}일차 ${n(d.intake)}kcal, 추천 식단 ${n(d.planned)}kcal, 나머지 끼니 가정 ${n(d.assumed)}kcal`}>
     <span className="week-bar-stack" style={{height:`${d.intake/max*100}%`}}>
      {d.assumed>0&&<i className="is-assumed" style={{flexGrow:d.assumed}}/>}
      <i className="is-planned" style={{flexGrow:d.planned}}/>
     </span>
     <small>{d.day}</small>
    </button>)}
   </div>
   <p className="week-day-note" aria-live="polite"><b>{day.day}일차 {n(day.intake)}kcal</b> · 추천 식단 {n(day.planned)}{day.assumed>0?` + 나머지 끼니 ${n(day.assumed)}`:''} · 유지보다 {day.delta>=0?`${n(day.delta)} 많게`:`${n(-day.delta)} 적게`}{day.unknown>0?` · 칼로리 미확인 ${day.unknown}끼는 목표량으로 계산`:''}</p>
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
