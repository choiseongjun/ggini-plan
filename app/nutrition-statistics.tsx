'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {weeklyCheckIn} from '../lib/weekly-check-in';
import {Card,Button,Notice} from './components/ui';
import {historyNutrients,nutritionHistoryTotals,type NutritionHistoryLog} from '../lib/nutrition-history';
import {calorieHistoryRange} from '../lib/calorie-history';
import {subscribeRecordSync} from '../lib/record-sync';
import styles from './nutrition-statistics.module.css';
type Log=NutritionHistoryLog&{id:string;name:string;mealSlot?:string|null};
type Weight={day:string;weight:number};
const number=(v:number|null,unit='')=>v===null?'—':`${v.toLocaleString('ko-KR',{maximumFractionDigits:1})}${unit}`;
export function NutritionStatistics({userId,onLogin}:{userId?:string;onLogin:()=>void}){
 const [period,setPeriod]=useState<'week'|'month'>('week'),[offset,setOffset]=useState(0),[revision,setRevision]=useState(0);
 const [metric,setMetric]=useState<typeof historyNutrients[number][0]>('calories');
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}),range=calorieHistoryRange(today,period,offset),key=`${userId}:${range.from}:${range.fetchTo}`;
 const [result,setResult]=useState<{key:string;logs:Log[];weights:Weight[];error?:string;weightError?:string}|null>(null);
 useEffect(()=>{if(!userId)return;const controller=new AbortController();
  const read=async(path:string)=>{const r=await fetch(path,{cache:'no-store',signal:controller.signal});const d=await r.json();if(!r.ok)throw Error(d.error??'기록을 불러오지 못했어요.');return d;};
  Promise.allSettled([read(`/api/food-intake?from=${range.from}&to=${range.fetchTo}`),read('/api/weight')]).then(([food,weight])=>{if(controller.signal.aborted)return;setResult({key,logs:food.status==='fulfilled'?food.value.logs:[],weights:weight.status==='fulfilled'?weight.value.logs:[],error:food.status==='rejected'?'식사 통계를 불러오지 못했어요.':undefined,weightError:weight.status==='rejected'?'체중 기록을 불러오지 못했어요.':undefined});});
  return()=>controller.abort();
 },[userId,key,range.from,range.fetchTo,revision]);
 useEffect(()=>{const refresh=()=>setRevision(n=>n+1);const unsubscribe=subscribeRecordSync(refresh);window.addEventListener('wellness-changed',refresh);window.addEventListener('intake-logged',refresh);return()=>{unsubscribe();window.removeEventListener('wellness-changed',refresh);window.removeEventListener('intake-logged',refresh);};},[]);
 const data=result?.key===key?result:null,logs=data?.logs??[],summary=nutritionHistoryTotals(logs),active=summary.find(n=>n.key===metric)!;
 const dates=Array.from({length:range.days},(_,i)=>{const d=new Date(range.from+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);}).filter(d=>d<=today);
 const days=dates.map(date=>{const entries=logs.filter(l=>l.date===date);return {date,entries,nutrient:nutritionHistoryTotals(entries).find(n=>n.key===metric)!};});
 const recorded=days.filter(d=>d.entries.length).length,max=Math.max(1,...days.map(d=>d.nutrient.total??0));
 const weights=(data?.weights??[]).filter(w=>w.day>=range.from&&w.day<=range.fetchTo).sort((a,b)=>a.day.localeCompare(b.day));
 const first=weights[0],last=weights.at(-1),change=weights.length>=2?Math.round((last!.weight-first.weight)*10)/10:null;
 return <div className={styles.screen}>
  <header><span className={styles.kicker}>나를 알아가는 기록</span><h1>내 식사의 흐름</h1><p>숫자보다, 쌓여가는 나의 일상을 봐요.</p></header>
  {!userId?<Card><h2>한 끼씩 쌓이면, 변화가 보여요</h2><p>기록한 영양소와 체중을 주별·월별로 함께 살펴보세요.</p><Button block onClick={onLogin}>로그인하고 내 통계 보기</Button></Card>:<>
  <div className={styles.period} aria-label="통계 기간">{(['week','month'] as const).map(p=><Button key={p} variant={period===p?'primary':'ghost'} aria-pressed={period===p} onClick={()=>{setPeriod(p);setOffset(0);}}>{p==='week'?'주간':'월간'}</Button>)}</div>
  <nav className={styles.range} aria-label="기간 이동"><Button variant="ghost" aria-label="이전 기간" onClick={()=>setOffset(n=>n-1)}>이전</Button><strong>{range.from.slice(2).replaceAll('-','.')} – {range.to.slice(5).replace('-','.')}</strong><Button variant="ghost" disabled={offset===0} aria-label="다음 기간" onClick={()=>setOffset(n=>n+1)}>다음</Button></nav>
  {offset<0&&<Button variant="ghost" onClick={()=>setOffset(0)}>이번 {period==='week'?'주':'달'}로 돌아오기</Button>}
  {!data?<Notice><span role="status">내 기록을 불러오고 있어요…</span></Notice>:<>
  {data.error?<Notice tone="error" action={<Button onClick={()=>setRevision(n=>n+1)}>다시 시도</Button>}>{data.error}</Notice>:<>
  <Card tone="soft"><div className={styles.coverage}><div><span>기록한 날</span><strong>{recorded}<small> / {dates.length}일</small></strong></div><div><span>음식 기록</span><strong>{logs.length}<small>건</small></strong></div></div><p className={styles.caption}>오늘까지의 기록 일수예요. 기록한 날에도 빠뜨린 식사가 있을 수 있어요.</p></Card>
  {!logs.length?<Card><h2>이 기간의 첫 기록을 기다려요</h2><p>기록하지 않은 날은 0 kcal로 계산하지 않아요.</p><Link className={styles.link} href="/record">식사 기록하러 가기 →</Link></Card>:<Card>
   <h2>영양소 흐름</h2><div className={styles.metrics} aria-label="영양소 선택">{summary.map(n=><button key={n.key} type="button" aria-pressed={metric===n.key} onClick={()=>setMetric(n.key)}>{n.label}</button>)}</div>
   <div className={styles.hero}><span>기록 기준 하루 평균 {active.label}</span><strong>{number(active.average)}<small>{active.unit}</small></strong><span>모든 기록의 {active.label} 값이 확인된 {active.days}일 기준</span></div>
   {active.missing>0&&<p className={styles.caption}>미확인 {active.missing}건이 있는 날짜는 평균에서 제외했어요.</p>}
   <div className={styles.chartScroll}><div className={`${styles.chart} ${period==='month'?styles.month:''}`} style={{gridTemplateColumns:`repeat(${days.length},minmax(0,1fr))`}} aria-label={`${active.label} 날짜별 기록 그래프`}>{days.map(d=><div className={styles.column} key={d.date}><div className={styles.track}><div className={`${styles.bar} ${d.nutrient.missing?styles.partial:''}`} style={{height:`${d.nutrient.total===null?0:Math.max(2,d.nutrient.total/max*100)}%`}}/></div><span>{d.date.slice(-2)}</span><small>{!d.entries.length?'미기록':d.nutrient.total===null?'미확인':d.nutrient.missing?'일부':'확인'}</small></div>)}</div></div>
   <p className={styles.caption}>막대는 확인된 값의 합계예요. 사선은 일부 미확인, ‘확인’은 입력된 영양값이 있다는 뜻이에요.</p>
   <details className={styles.details}><summary>날짜별 수치와 음식 보기</summary>{days.map(d=><div className={styles.day} key={d.date}><strong>{d.date.slice(5)} · {number(d.nutrient.total,` ${active.unit}`)}{d.nutrient.missing>0?' · 일부 또는 전체 미확인':''}</strong><p>{d.entries.length?d.entries.map(l=>l.name).join(' · '):'기록 없음'}</p></div>)}</details>
  </Card>}
  {period==='week'&&<Card tone="soft"><h2>이번 기록에서 챙길 한 가지</h2><p>주요 영양정보 확인 {weeklyCheckIn(logs).confirmed}건 · 미확인 {weeklyCheckIn(logs).missing}건</p><p>{weeklyCheckIn(logs).text}</p><Link className={styles.link} href={weeklyCheckIn(logs).href}>{weeklyCheckIn(logs).missing?'식사 일기 확인하기':'한 끼 기록하기'} →</Link><p className={styles.caption}>입력된 열량·탄수화물·단백질·지방 기준이에요. 미기록은 결식이나 0 kcal를 의미하지 않아요.</p></Card>}
  {logs.length>0&&<Card><h2>기간 영양소 요약</h2><div className={styles.summary}>{summary.map(n=><div key={n.key}><span>{n.label}</span><strong>{number(n.total,` ${n.unit}`)}</strong><small>확인된 합계{n.missing?` · 미확인 ${n.missing}건`:''}</small><small>일평균 {number(n.average,` ${n.unit}`)} · {n.days}일</small></div>)}</div></Card>}
  </>}
  <Card><div className={styles.weightTitle}><h2>체중의 변화</h2><Link href="/record">체중 기록</Link></div>{data.weightError?<Notice tone="error" action={<Button onClick={()=>setRevision(n=>n+1)}>다시 시도</Button>}>{data.weightError}</Notice>:!weights.length?<p>이 기간에 입력한 체중이 없어요. 식사 일기의 ‘생활 기록 · 물·체중’에서 남겨보세요.</p>:<><div className={styles.hero}><span>기간 내 마지막 기록 · {last!.day.slice(5)}</span><strong>{number(last!.weight)}<small>kg</small></strong><span>{change===null?'두 번 이상 기록하면 변화를 볼 수 있어요.':`${first.day.slice(5)} 대비 ${change>0?'+':''}${change} kg · ${weights.length}일 기록`}</span></div>{weights.length>=2&&<svg className={styles.weightChart} viewBox="0 0 300 100" role="img" aria-label={`체중 ${first.weight}kg에서 ${last!.weight}kg으로 변화`}><polyline fill="none" stroke="currentColor" strokeWidth="2" points={weights.map(w=>{const low=Math.min(...weights.map(v=>v.weight))-.5,high=Math.max(...weights.map(v=>v.weight))+.5;return `${10+(Date.parse(w.day)-Date.parse(range.from))/86400000/Math.max(1,range.days-1)*280},${85-(w.weight-low)/(high-low)*70}`;}).join(' ')}/></svg>}<details className={styles.details}><summary>날짜별 체중 보기</summary>{weights.map(w=><p key={w.day}>{w.day} · {w.weight} kg</p>)}</details></>}<p className={styles.caption}>직접 입력한 최근 180일 기록에서 표시해요. 체중 변화가 체지방 변화와 같지는 않아요.</p></Card>
  <Notice>영양소는 저장한 음식과 분량 기준의 추정치예요. 하루 전체 섭취량이나 식사의 적정성을 단정하지 않아요.</Notice>
  </>}
  </>}
 </div>;
}
