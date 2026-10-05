'use client';
import Link from 'next/link';
import type {ReactNode} from 'react';
import {Card} from './components/ui';
import type {DailyNutritionReference} from '../lib/daily-nutrition-reference';
import styles from './today-balance.module.css';
import {nextMealHint} from '../lib/next-meal-hint';

type Totals={calories:number;protein:number};

// 먹은 것 → 다음 끼니: 오늘 기록이 있으면 홈 맨 위에서 남은 양과 다음 끼니 방향을 알려 준다.
export function TodayBalance({totals,meals,reference,action}:{totals:Totals;meals:number;reference:DailyNutritionReference;action?:ReactNode}){
 if(meals<1)return null;
 const kcal=Math.round(totals.calories),protein=Math.round(totals.protein);
 if(!reference)return <Card tone="soft" className={styles.card} aria-label="오늘 먹은 양">
  <p className={styles.kicker}>오늘 먹은 양 · {meals}번 기록</p>
  <p className={styles.headline}><strong>{kcal.toLocaleString('ko-KR')}kcal</strong> · 단백질 {protein}g</p>
  <p className={styles.hint}><Link href="/profile">키·체중을 넣으면</Link> 남은 양을 계산해서 다음 끼니를 맞춰 드려요.</p>
  {action&&<div className={styles.action}>{action}</div>}
 </Card>;
 const {kcalLeft,proteinLeft,hint}=nextMealHint(totals,reference);
 const pct=(v:number,max:number)=>`${Math.max(2,Math.min(100,v/max*100))}%`;
 return <Card tone="soft" className={styles.card} aria-label="오늘 먹은 양과 남은 양">
  <p className={styles.kicker}>오늘 먹은 양 · {meals}번 기록</p>
  <p className={styles.headline}><strong>{kcal.toLocaleString('ko-KR')}kcal</strong> 먹었어요{kcalLeft>0&&<> · 남은 {kcalLeft.toLocaleString('ko-KR')}kcal</>}</p>
  <div className={styles.bars}>
   <div><span>열량</span><i aria-hidden="true"><b style={{width:pct(totals.calories,reference.calories)}}/></i><small>{kcal}/{reference.calories.toLocaleString('ko-KR')}</small></div>
   <div><span>단백질</span><i aria-hidden="true"><b style={{width:pct(totals.protein,reference.protein)}}/></i><small>{protein}/{reference.protein}g{proteinLeft<=0?' ✓':''}</small></div>
  </div>
  <p className={styles.hint}>{hint}</p>
  {action&&<div className={styles.action}>{action}</div>}
 </Card>;
}
