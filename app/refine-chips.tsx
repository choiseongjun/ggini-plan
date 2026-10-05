'use client';
import type {PlanConditions} from '../lib/shopping-plan';
import {mealTastes,type MealTaste} from '../lib/meal-tastes';
import {trackAnalytics} from '../lib/analytics';
import type {AnalyticsRefine} from '../lib/analytics-events';
import styles from './refine-chips.module.css';

// 추천 결과를 말 대신 탭으로 다듬는다: 한 번 누르면 그 조건으로 바로 다시 추천한다. 다시 누르면 해제.
type Chip={key:AnalyticsRefine;label:string;active:(c:PlanConditions)=>boolean;toggle:(c:PlanConditions)=>PlanConditions};
const goalChip=(key:AnalyticsRefine,label:string,goal:'lose'|'muscle'):Chip=>({key,label,active:c=>c.goal===goal,toggle:c=>({...c,goal:c.goal===goal?'maintain':goal})});
const tasteChip=(taste:MealTaste):Chip=>({key:taste,label:mealTastes[taste],active:c=>Boolean(c.tastes?.includes(taste)),
 toggle:c=>{const tastes=c.tastes?.includes(taste)?c.tastes.filter(t=>t!==taste):[...(c.tastes??[]),taste];return {...c,tastes:tastes.length?tastes:undefined};}});
const CHIPS:Chip[]=[goalChip('lighter','더 가볍게','lose'),goalChip('protein','단백질 많이','muscle'),tasteChip('spicy'),tasteChip('soup'),tasteChip('meat')];

export function RefineChips({conditions,disabled,onRefine}:{conditions:PlanConditions;disabled:boolean;onRefine:(next:PlanConditions)=>void}){
 return <section className={styles.refine} aria-label="추천 다듬기">
  <p className={styles.title}>이렇게 바꿔 볼까요?</p>
  <div className={styles.chips}>{CHIPS.map(chip=>{const on=chip.active(conditions);return <button key={chip.key} type="button" aria-pressed={on} disabled={disabled} className={styles.chip}
   onClick={()=>{trackAnalytics('recommendation_refined',{refine:chip.key});onRefine(chip.toggle(conditions));}}>{on&&<span aria-hidden="true">✓ </span>}{chip.label}</button>;})}</div>
 </section>;
}
