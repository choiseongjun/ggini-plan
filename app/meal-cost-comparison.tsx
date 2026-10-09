'use client';
import {useId,useState} from 'react';
import {compareMealCost} from '../lib/meal-cost-comparison';
import {trackAnalytics} from '../lib/analytics';
import styles from './meal-cost-comparison.module.css';

export function MealCostComparison({cost,isRecipe}:{cost:number;isRecipe:boolean}){
 const inputId=useId();
 const [usual,setUsual]=useState('');
 const difference=compareMealCost(cost,Number(usual));
 if(!Number.isFinite(cost)||cost<=0)return null;
 return <details className={styles.card}>
  <summary>평소 먹는 한 끼와 비용 비교하기</summary>
  <div className={styles.body}>
   <label htmlFor={inputId}>평소 배달·외식 한 끼 결제 금액</label>
   <div className={styles.input}><input id={inputId} type="number" inputMode="numeric" min="1" max="1000000" placeholder="금액 입력" value={usual} onChange={e=>setUsual(e.target.value)} onBlur={()=>{if(difference!==null)trackAnalytics('meal_cost_compared');}}/><span>원</span></div>
   <p role="status">{difference===null?'평소 금액을 넣으면 이 메뉴의 예상 비용과 비교해 드려요.':difference>0?<>이 메뉴는 1인분 기준 약 <strong>{difference.toLocaleString()}원 적게</strong> 들어요.</>:difference<0?<>이 메뉴는 1인분 기준 약 <strong>{(-difference).toLocaleString()}원 더</strong> 들어요.</>:'예상 비용이 평소 한 끼 금액과 같아요.'}</p>
   <small>{isRecipe?'등록된 재료 가격을 1인분 사용량으로 나눈 추정치예요. 재료를 새로 사는 전체 결제액과는 달라요.':'등록된 상품의 1인분 예상 가격이에요.'} 배송비·조리 비용은 제외하며, 실제 절약액은 아니에요.</small>
  </div>
 </details>;
}
