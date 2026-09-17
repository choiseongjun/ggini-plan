'use client';
import {shoppingGoals,type ShoppingGoal} from '../lib/shopping-goals';
import styles from './shopping-goal-picker.module.css';

export function ShoppingGoalPicker({value='maintain',onChange,settings}:{value?:ShoppingGoal;onChange:(goal:ShoppingGoal)=>void;settings:boolean}){
 return <fieldset className={styles.picker}>
  <legend>식사 목표</legend>
  <p>{settings?'자주 쓰는 목표를 저장해 두세요. 홈에서 이번 추천의 목표를 바꿀 수도 있어요.':'이번에 준비할 식사의 목표를 골라 주세요.'}</p>
  <div className={styles.options}>{(Object.keys(shoppingGoals) as ShoppingGoal[]).map(goal=><label key={goal} className={value===goal?styles.selected:undefined}>
   <input type="radio" name="shopping-goal" value={goal} checked={value===goal} onChange={()=>onChange(goal)}/>
   <span><strong>{shoppingGoals[goal].label}</strong><small>{shoppingGoals[goal].description}</small></span>
  </label>)}</div>
  {value!=='maintain'&&<p className={styles.note}>목표는 메뉴 비교 순서에 반영해요. 하루 섭취 목표 열량을 정하거나 끼니 수·분량을 자동으로 줄이지는 않아요. 영양정보가 부족하면 목표 반영이 제한될 수 있어요.</p>}
 </fieldset>;
}
