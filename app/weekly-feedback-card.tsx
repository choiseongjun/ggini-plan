'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {NextWeekMenuModal,type NextWeekMeal} from './next-week-menu-modal';
import type {WeeklyFeedback,compareWeeklyPlans} from '../lib/weekly-feedback';
import type {PlanConditions} from '../lib/shopping-plan';
import {invalidateJson} from '../lib/client-cache';
import './weekly-feedback-card.css';
type Proposal={report:WeeklyFeedback;conditions:PlanConditions;ids:string[];comparison:ReturnType<typeof compareWeeklyPlans>;meals:NextWeekMeal[];repeatedBefore:number;repeatedAfter:number};
export function WeeklyFeedbackCard({userId}:{userId:string}){
 const [menuOpen,setMenuOpen]=useState(false);
 const [report,setReport]=useState<WeeklyFeedback|null>(null),[proposal,setProposal]=useState<Proposal|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();fetch('/api/weekly-feedback',{cache:'no-store',signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error);return data;}).then(data=>{setReport(data);setError('');}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[userId,retry]);
 useEffect(()=>{const changed=()=>{setMenuOpen(false);setProposal(null);setSaved(false);setRetry(n=>n+1);};window.addEventListener('intake-logged',changed);window.addEventListener('shopping-progress-changed',changed);return()=>{window.removeEventListener('intake-logged',changed);window.removeEventListener('shopping-progress-changed',changed);};},[]);
 async function generate(){setBusy(true);setError('');setSaved(false);try{const r=await fetch('/api/weekly-feedback',{method:'POST'}),data=await r.json();if(!r.ok)throw Error(data.error);setProposal(data);setReport(data.report);setMenuOpen(true);}catch(e){setError(e instanceof Error?e.message:'식단을 만들지 못했어요.');}finally{setBusy(false);}}
 async function save(){if(!proposal)return;setSaving(true);setError('');try{const r=await fetch('/api/shopping-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conditions:proposal.conditions,mealIds:proposal.ids})});const data=await r.json();if(!r.ok)throw Error(data.error);invalidateJson('/api/shopping-plan');const key=`kkiniplan-shopping-draft-v2-${userId}`;try{localStorage.setItem(key,JSON.stringify({conditions:proposal.conditions,mealIds:proposal.ids,savedAt:Date.now()}));sessionStorage.removeItem(key);}catch{/* Account save remains available. */}window.dispatchEvent(new CustomEvent('home-plan-changed',{detail:{key}}));setSaved(true);}catch(e){setError(e instanceof Error?e.message:'식단을 저장하지 못했어요.');}finally{setSaving(false);}}
 const comparison=proposal?.comparison;
 return <section id="weekly-feedback" className="weekly-feedback" aria-label="주간 피드백과 다음 주 식단">
  <header><span>기록이 다음 식단으로 이어져요</span><h3>이번 주 돌아보기, 다음 주 준비하기</h3></header>
  {loading?<p role="status">최근 기록을 살펴보고 있어요…</p>:report&&<><p className="weekly-feedback-period">최근 7일 · {report.from} ~ {report.to}</p><ul>{report.points.map(point=><li key={point}>{point}</li>)}</ul><small>기록한 음식만 참고했어요. 미기록은 결식으로 보지 않으며, 세 끼 기록도 하루 전체 섭취를 보장하지 않아요. 사진·레시피 영양은 추정치예요.</small>
  {!report.days?<Link href="/record">한 끼 기록하기 →</Link>:<button type="button" disabled={busy||saving} onClick={()=>proposal?setMenuOpen(true):void generate()}>{busy?'기록을 반영해 식단 만드는 중…':proposal?'다음 주 식단 다시 확인':'피드백으로 다음 주 식단 만들기'}</button>}</>}
  {error&&<p role="alert">{error} {!report&&<button type="button" onClick={()=>setRetry(n=>n+1)}>다시 불러오기</button>}</p>}
  {proposal&&comparison&&<div className="weekly-feedback-proposal">
   <h4>{comparison.changed?'다음 주 식단, 이렇게 바꿨어요':'다음 주 식단, 이렇게 구성했어요'}</h4><p>{proposal.conditions.startDate}부터 7일 · {proposal.ids.length}끼</p>
   <ul><li>예산·제외 재료·챙길 끼니와 반찬 구성은 기존 설정을 유지했어요.</li>
    <li>{comparison.changed?`같은 조건의 기본 추천안과 비교해 ${comparison.changed}끼의 메뉴가 바뀌었어요.`:'현재 조건에서는 기본 추천안과 같은 메뉴가 선택됐어요. 바뀌지 않은 결과를 개선됐다고 표시하지 않아요.'}</li>
    {proposal.report.proteinFocus&&comparison.protein.before!==null&&comparison.protein.after!==null&&<li>한 끼 평균 단백질: {comparison.protein.before}g → {comparison.protein.after}g {comparison.protein.after>comparison.protein.before?'· 더 많은 안을 찾았어요.':'· 기존 조건 안에서는 더 늘리지 못했어요.'}</li>}
    {proposal.report.sodiumFocus&&comparison.sodium.before!==null&&comparison.sodium.after!==null&&<li>한 끼 평균 나트륨: {comparison.sodium.before}mg → {comparison.sodium.after}mg {comparison.sodium.after<comparison.sodium.before?'· 더 낮은 안을 찾았어요.':'· 기존 조건 안에서는 더 줄이지 못했어요.'}</li>}
    {!!proposal.report.repeated.length&&<li>최근 반복 기록한 메뉴 포함: {proposal.repeatedBefore}끼 → {proposal.repeatedAfter}끼</li>}
   </ul><small>같은 다음 주 조건으로 만든 기본 추천안과 비교한 예상 영양입니다. 실제 섭취량의 변화는 아니에요.</small>
   <button type="button" aria-haspopup="dialog" onClick={()=>setMenuOpen(true)}>다음 주 식탁 펼쳐보기 →</button>
   {saved?<p role="status">다음 주 식단을 저장했어요. <Link href="/calendar/week">주간 식단 보기 →</Link></p>:<><p>저장하면 홈의 선택 식단이 이 다음 주 식단으로 바뀌어요.</p><button type="button" disabled={saving||busy} onClick={()=>void save()}>{saving?'저장 중…':'이 다음 주 식단 저장하기'}</button></>}
  </div>}
  {proposal&&<NextWeekMenuModal key={proposal.conditions.startDate} open={menuOpen} onClose={()=>setMenuOpen(false)} startDate={proposal.conditions.startDate!} meals={proposal.meals} onSave={()=>void save()} saving={saving} saved={saved} error={error}/>}
 </section>;
}
