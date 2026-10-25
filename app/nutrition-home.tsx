'use client';

import Link from 'next/link';
import {useEffect} from 'react';
import {RecordEntry} from './record-entry';
import {RecentMealReuse} from './recent-meal-reuse';
import {useFoodIntake} from './food-intake';
import {Card,Button,Notice} from './components/ui';
import {Icon} from './components/icons';
import styles from './nutrition-home.module.css';
import {WellnessTracker} from './wellness-tracker';
import {WaterReminderCard} from './water-reminder-card';

export function NutritionHome({userId,onLogin}:{userId?:string;onLogin:()=>void}){
 useEffect(()=>{if(window.location.hash!=='#water-tracker')return;const frame=requestAnimationFrame(()=>{const target=document.getElementById('water-tracker');if(target instanceof HTMLDetailsElement)target.open=true;target?.scrollIntoView({block:'start'});});return()=>cancelAnimationFrame(frame);},[]);
 const {current,totals,loading,error,reload,today}=useFoodIntake(userId);
 const logs=current?.logs??[];
 const macros=[['탄수화물',totals?.carbs,totals?.missing_carbs],['단백질',totals?.protein,totals?.missingProtein],['지방',totals?.fat,totals?.missing_fat]] as const;
 return <div className={styles.home}>
  <header className={styles.heading}><h1>오늘 무엇을 먹었나요?</h1><span>{today.slice(5).replace('-','월 ')}일</span></header>
  <RecordEntry compact userId={userId} onLogin={onLogin} onLogged={()=>reload()}/>
  {userId&&<RecentMealReuse key={userId}/>}
  <Card className={styles.nutrition} aria-label="오늘 기록한 영양소">
   <div className={styles.sectionTitle}><h2>오늘의 영양</h2><Link href="/stats">통계 보기 →</Link></div>
   {loading?<p role="status">오늘 기록을 불러오고 있어요…</p>:error?<Notice tone="error" action={<Button variant="secondary" onClick={reload}>다시 불러오기</Button>}>{error}</Notice>:<>
    <p className={styles.energy}><strong>{logs.length&&totals?.missingCalories!==logs.length?Math.round(totals?.calories??0).toLocaleString('ko-KR'):'—'}</strong><span>kcal{Boolean(totals?.missingCalories)&&(totals?.missingCalories===logs.length?' · 미확인':' · 일부 미확인')}</span></p>
    <dl className={styles.macros}>{macros.map(([label,value,missing])=><div key={label}><dt>{label}</dt><dd>{logs.length&&missing!==logs.length?`${Math.round(value??0)} g`:'—'}{Boolean(missing)&&<small>{missing===logs.length?'미확인':'일부 미확인'}</small>}</dd></div>)}</dl>
    {!logs.length&&<p className={styles.note}>첫 식사를 기록해 보세요.</p>}
   </>}
  </Card>
  {logs.length>0&&<details className={styles.fold}><summary>오늘 기록한 음식 <span>{logs.length}개</span></summary><section className={styles.diary} aria-label="오늘 남긴 식사">
   <div className={styles.sectionTitle}><h2>오늘 남긴 식사</h2><Link href="/record">일기 보기 <Icon name="chevron" size={14}/></Link></div>
   {!logs.length?<div className={styles.empty}><Icon name="edit" size={24}/><strong>첫 한 끼를 기다리고 있어요</strong><p>간식 하나도 괜찮아요.<br/>위에서 사진이나 이름으로 남겨보세요.</p></div>:<ul className={styles.logList}>{logs.slice(-4).map(log=><li key={log.id}><span><strong>{log.name}</strong><small>{log.portions}회분</small></span><b>{log.calories===null?'영양 미확인':`${Math.round(log.calories)} kcal`}</b></li>)}</ul>}
  </section></details>}
  <details className={styles.fold} id="water-tracker"><summary>물 기록 <span>마신 양 · 알림</span></summary><WellnessTracker userId={userId} onLogin={onLogin} waterOnly/><details><summary>물 알림 시간 설정</summary><WaterReminderCard userId={userId}/></details></details>
  <details className={styles.fold}><summary>다음 식사 준비 <span>냉장고 · 메뉴</span></summary><nav className={styles.shortcuts} aria-label="다음 식사 준비"><Link href="/ingredients"><strong>내 냉장고</strong><span>재료로 추천받기 →</span></Link><Link href="/next-meal"><strong>메뉴 추천</strong><span>다음 한 끼 고르기 →</span></Link></nav></details>
 </div>;
}
