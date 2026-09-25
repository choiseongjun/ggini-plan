'use client';

import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {IntakeStats} from '../lib/intake-stats';
import type {buddyGrowth} from '../lib/buddy-growth';
import {RecordMedal} from './record-medal';
import './record-progress.css';

type Stats=IntakeStats&{goals:{calories:number|null;protein:number|null};buddy?:ReturnType<typeof buddyGrowth>};
export const INTAKE_LOGGED_EVENT='intake-logged';

// Streak/badges/weekly report for the signed-in user; refetches whenever a meal is logged or undone.
export function useIntakeStats(userId?:string){
 const [stats,setStats]=useState<Stats|null>(null);
 const [newBadges,setNewBadges]=useState<Stats['badges']>([]);
 const earned=useRef<Set<string>|null>(null);
 useEffect(()=>{
  if(!userId)return;
  let alive=true,revision=0;
  const day=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});
  let lastDay=day();
  const load=()=>{const request=++revision;return fetch('/api/food-intake/stats',{cache:'no-store'}).then(r=>r.ok?r.json():null).then((d:Stats|null)=>{
   if(!alive||request!==revision||!d)return;
   const now=d.badges.filter(b=>b.earned);
   // Only celebrate badges earned while the page is open, not ones from before.
   if(earned.current)setNewBadges(now.filter(b=>!earned.current!.has(b.key)));
   earned.current=new Set(now.map(b=>b.key));
   setStats(d);
  }).catch(()=>{});};
  void load();
  const changed=(e:Event)=>{const detail=(e as CustomEvent).detail;if(e.type===INTAKE_LOGGED_EVENT||detail?.source==='intake')void load();};
  window.addEventListener(INTAKE_LOGGED_EVENT,changed);window.addEventListener('shopping-progress-changed',changed);
  const visible=()=>{if(document.visibilityState==='visible'){const now=day();if(now!==lastDay)setStats(null);lastDay=now;void load();}};
  const timer=window.setInterval(()=>{const now=day();if(now!==lastDay){lastDay=now;setStats(null);void load();}},60000);
  document.addEventListener('visibilitychange',visible);
  return()=>{alive=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener(INTAKE_LOGGED_EVENT,changed);window.removeEventListener('shopping-progress-changed',changed);};
 },[userId]);
 const dismissBadges=useCallback(()=>setNewBadges([]),[]);
 return {stats,newBadges,dismissBadges};
}

const Flame=({size=18}:{size?:number})=><svg className="rp-flame" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22c-4.4 0-7.4-2.9-7.4-7 0-3.9 2.6-6.4 4.3-8.6.4 1.9 1.5 3.2 2.7 3.8.2-3.3 1.9-6 4.1-8.2.4 3.4 1.7 5.2 3 7 1.1 1.6 2.1 3.4 2.1 5.9 0 4.4-3.8 7.1-8.8 7.1Z" fill="currentColor"/><path d="M12 22c-1.9 0-3.3-1.4-3.3-3.2 0-1.9 1.5-3.1 2.6-4.4.4 1.1 1 1.8 1.8 2.1.2-1 .7-1.8 1.2-2.4.8 1.1 1.2 2.3 1.2 3.4 0 2.6-1.5 4.5-3.5 4.5Z" fill="#fff4c9"/></svg>;

export function StreakChip({stats}:{stats:Stats|null}){
 if(!stats)return null;
 const {current,loggedToday}=stats.streak;
 if(!current&&!loggedToday)return <span className="rp-chip is-idle"><Flame size={15}/>오늘 첫 기록을 남겨 보세요</span>;
 return <span className={`rp-chip${loggedToday?' is-lit':''}`}><Flame size={15}/><b>{current}일 연속</b>{!loggedToday&&<small>오늘 기록하면 {current+1}일</small>}</span>;
}

export function BadgeToast({badges,onClose}:{badges:Stats['badges'];onClose:()=>void}){
 useEffect(()=>{if(!badges.length)return;const t=window.setTimeout(onClose,6000);return()=>window.clearTimeout(t);},[badges,onClose]);
 if(!badges.length)return null;
 const b=badges[0];
 return <div className="rp-toast" role="status" onClick={onClose}>
  <span className={`rp-toast-icon tone-${b.tone}`}><RecordMedal badgeKey={b.key}/></span>
  <div><small>새 배지를 받았어요</small><strong>{b.label}</strong><span>{b.description}</span></div>
 </div>;
}

export function RecordCard({stats}:{stats:Stats|null}){
 if(!stats)return null;
 const {streak,badges}=stats;
 const next=badges.find(b=>!b.earned);
 return <section className="rp-card" aria-label="기록 현황">
  <div className="rp-streak">
   <div className={`rp-streak-flame${streak.loggedToday?' is-lit':''}`}><Flame size={40}/></div>
   <div><span className="rp-kicker">연속 기록</span><strong>{streak.current}<small>일</small></strong><p>{streak.loggedToday?'오늘도 기록했어요!':streak.current?`오늘 기록하면 ${streak.current+1}일째예요`:'오늘 한 끼를 사진으로 남겨 보세요'} · 최고 {streak.best}일</p></div>
  </div>
  <p className="rp-freeze"><span className={streak.freezeAvailable?'is-on':''} aria-hidden="true"/>{streak.freezeAvailable?'이번 주 쉬기권 1장 · 하루 못 올려도 연속 기록이 이어져요':'이번 주 쉬기권을 썼어요 · 다음 주 월요일에 다시 생겨요'}</p>
  {next&&<div className="rp-next"><span>다음 배지 · <b>{next.label}</b></span><div className="rp-bar"><i style={{width:`${next.progress/next.goal*100}%`}}/></div><small>{next.description} ({next.progress}/{next.goal})</small></div>}
  <ul className="rp-badges">{badges.map(b=><li key={b.key} className={b.earned?'is-earned':''} title={b.description}>
   <span className={`rp-badge-icon tone-${b.tone}`}><RecordMedal badgeKey={b.key}/>{b.earned&&<i aria-hidden="true"/>}</span>
   <strong>{b.label}</strong><small>{b.earned?'획득':`${b.progress}/${b.goal}`}</small>
   <span className="rp-badge-description">{b.description}</span>
  </li>)}</ul>
 </section>;
}

const fmt=(date:string)=>`${Number(date.slice(5,7))}/${Number(date.slice(8))}`;
export function WeeklyReportCard({stats}:{stats:Stats|null}){
 const [which,setWhich]=useState<'week'|'lastWeek'>('week');
 if(!stats)return null;
 const r=stats[which];
 const g=stats.goals;
 return <section className="rp-report" aria-label="주간 리포트">
  <header><div><span className="rp-kicker">주간 리포트</span><h3>{fmt(r.start)} – {fmt(r.end)}</h3></div>
   <div className="rp-tabs" role="tablist">{([['week','이번 주'],['lastWeek','지난주']] as const).map(([k,label])=><button type="button" role="tab" key={k} aria-selected={which===k} onClick={()=>setWhich(k)}>{label}</button>)}</div></header>
  {!r.days?<p className="rp-empty">{which==='week'?'이번 주 기록이 아직 없어요. 한 끼만 사진으로 남겨도 리포트가 만들어져요.':'지난주에는 기록이 없어요.'}</p>:<>
   <dl className="rp-stats">
    <div><dt>기록한 날</dt><dd>{r.days}<small>/7일</small></dd></div>
    <div><dt>기록한 끼니</dt><dd>{r.meals}<small>끼</small></dd></div>
    <div><dt>하루 평균</dt><dd>{r.avgCalories?.toLocaleString('ko-KR')}<small>kcal</small></dd>{g.calories&&r.avgCalories!==null&&<em className={r.avgCalories>g.calories*1.1?'is-over':r.avgCalories<g.calories*0.8?'is-under':'is-ok'}>목표 {g.calories.toLocaleString('ko-KR')}</em>}</div>
    <div><dt>단백질 목표</dt><dd>{r.proteinDays??'—'}<small>일 달성</small></dd>{g.protein&&<em>하루 {g.protein}g</em>}</div>
   </dl>
   <ul className="rp-facts">
    {r.favorite&&<li><span>가장 많이 먹은 메뉴</span><b>{r.favorite.name} · {r.favorite.count}번</b></li>}
    {r.spent>0&&<li><span>기록한 식사 비용</span><b>약 {r.spent.toLocaleString('ko-KR')}원</b></li>}
    {r.extras>0&&<li><span>함께 먹은 간식·음료</span><b>{r.extras}번</b></li>}
   </ul>
   {r.tip&&<div className={`rp-tip is-${r.tip.kind}`}><strong>{which==='week'?'이번 주 팁':'다음 주엔 이렇게'}</strong><p>{r.tip.text}</p>{r.tip.kind!=='good'&&r.tip.kind!=='habit'&&<Link href="/">홈에서 다음 식단 추천받기 →</Link>}</div>}
  </>}
 </section>;
}
