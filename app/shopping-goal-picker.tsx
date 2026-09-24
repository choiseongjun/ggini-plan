'use client';
import {shoppingGoals,type ShoppingGoal} from '../lib/shopping-goals';
import styles from './shopping-goal-picker.module.css';

export function ShoppingGoalPicker({value='maintain',onChange,settings,disabled}:{value?:ShoppingGoal;onChange:(goal:ShoppingGoal)=>void;settings:boolean;disabled?:boolean}){
 return <fieldset className={styles.picker} disabled={disabled}>
  <legend>어떤 식단으로 먹고 싶어요?</legend>
  <p>{settings?'자주 쓰는 목표를 저장해 두세요. 홈에서 이번 추천의 목표를 바꿀 수도 있어요.':'고른 목표에 맞춰 메뉴 추천 순서를 바꿔요.'}</p>
  <div className={styles.options}>{(Object.keys(shoppingGoals) as ShoppingGoal[]).map(goal=><label key={goal} className={value===goal?styles.selected:undefined}>
   <input type="radio" name="shopping-goal" value={goal} checked={value===goal} onChange={()=>onChange(goal)}/>
   <span><strong>{shoppingGoals[goal].label}</strong><small>{shoppingGoals[goal].description}</small></span>
  </label>)}</div>
  {value!=='maintain'&&<p className={styles.note}>목표는 메뉴 비교 순서에 반영해요. 하루 섭취 목표 열량을 정하거나 끼니 수·분량을 자동으로 줄이지는 않아요. 비교할 영양정보가 없는 상품은 해당 목표의 추천에서 제외해요.</p>}
  {value==='lowcarb'&&<p className={styles.note}>등록 메뉴 사이의 상대 비교예요. 엄격한 키토 식단이나 하루 탄수화물 제한을 보장하지 않아요. 밥·소스가 포함될 수 있으니 결과의 탄수화물 g도 확인해 주세요.</p>}
 </fieldset>;
}
