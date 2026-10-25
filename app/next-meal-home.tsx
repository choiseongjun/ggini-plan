'use client';

import Link from 'next/link';
import type {ReactNode} from 'react';
import {trackAnalytics} from '../lib/analytics';
import {RiceBuddy} from './rice-buddy';
import {useFoodIntake} from './food-intake';
import {ServiceFeedback} from './service-feedback';
import styles from './next-meal-home.module.css';

export function NextMealHome({userId,children}:{userId?:string;children:ReactNode}) {
 const intake=useFoodIntake(userId);
 const logs=intake.current?.logs??[];
 return <div className={styles.home}>
  <section className={styles.hero} aria-labelledby="next-meal-title">
   <span className={styles.eyebrow}>혼자 먹는 날도, 잘 챙겨 먹자</span>
   <div className={styles.intro}><div><h1 id="next-meal-title">오늘 뭐 먹지? <br/>일단 메뉴부터 봐요.</h1><p>지금 먹을 끼니를 먼저 골라둘게요.<br/>마음에 안 들면 다른 메뉴로 바꿔요.</p></div><div className={styles.buddy} aria-hidden="true"><RiceBuddy stage={1}/></div></div>
   <p className={styles.note}>로그인이나 식사 기록 없이 추천받을 수 있어요.</p>
  </section>
  <section className={styles.recommendations} aria-labelledby="home-recommendations-title">
   <div className={styles.journalHeading}><h2 id="home-recommendations-title">집에서 먹을 메뉴부터</h2><span id="today-plan-tools"/></div>
   {children}
  </section>
  <nav className={styles.alternatives} aria-label="다른 방법으로 한 끼 고르기">
   <Link href="/convenience" onClick={()=>trackAnalytics('home_convenience_clicked')}><span aria-hidden="true">🥡</span><strong>오늘은 요리 쉴래요</strong><small>편의점에서 한 끼 찾기 →</small></Link>
   <Link href="/eat-out" onClick={()=>trackAnalytics('home_eat_out_clicked')}><span aria-hidden="true">🍜</span><strong>밖에서 먹을래요</strong><small>외식 메뉴 둘러보기 →</small></Link>
  </nav>
  <Link className={styles.record} href="/record" onClick={()=>trackAnalytics('home_record_clicked')}><span className={styles.recordIcon} aria-hidden="true">＋</span><span><strong>이미 드셨나요? 한 끼 남기기</strong><small>사진이나 음식 이름으로 기록해요</small></span><span aria-hidden="true">→</span></Link>
  {(logs.length>0||intake.loading||intake.error)&&<section className={styles.journal} aria-label="오늘의 식사 기록">
   <div className={styles.journalHeading}><h2>오늘 남긴 한 끼</h2><Link href="/record">식사 일기 →</Link></div>
   {intake.loading?<p role="status">오늘 기록을 불러오고 있어요.</p>:intake.error?<p role="alert">기록을 불러오지 못했어요. <button type="button" onClick={intake.reload}>다시 불러오기</button></p>:logs.length?<><ul>{logs.slice(-3).map(log=><li key={log.id}><span>{log.name}</span><small>{log.portions}인분</small></li>)}</ul><p className={styles.note}>오늘 기록한 음식 {logs.length}개{!userId?' · 이 기기에 저장되어 있어요.':'.'}</p></>:<div className={styles.empty}><span aria-hidden="true">◌</span><div><strong>첫 기록은 한 끼면 충분해요</strong><p>추천과 다른 음식을 먹어도 괜찮아요.<br/>먹은 음식을 남기고 식사 흐름을 살펴보세요.</p></div></div>}
  </section>}
  <p className={styles.maker}>혼자 만드는 끼니플랜.<br/>여러분의 한 끼 이야기를 듣고 개선해요.</p>
  <ServiceFeedback page="/"/>
 </div>;
}
