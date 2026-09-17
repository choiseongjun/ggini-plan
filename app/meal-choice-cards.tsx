import {servingNutrition} from '../lib/food-intake';
import type {PlanProduct} from '../lib/shopping-plan';

export function MealChoiceCards({ready,recipeName,recipeCost,minutes}:{ready:PlanProduct;recipeName:string;recipeCost:number|null;minutes:string}){
 const nutrition=servingNutrition(ready);
 const won=(value:number)=>`${Math.round(value).toLocaleString('ko-KR')}원`;
 return <>
  <dl className="cook-price-compare">
   <div><dt>🛍️ 사 먹기</dt><dd>{won(ready.price/ready.servings)}</dd><span className="cook-choice-name">{ready.name}</span><small>상품 1회분{ready.servingGrams?` · ${ready.servingGrams}g`:''}</small><small>{nutrition.calories===null?'칼로리 미확인':`${Math.round(nutrition.calories)} kcal`}<br/>단백질 {nutrition.protein===null?'미확인':`${Math.round(nutrition.protein)}g`}</small></div>
   <div><dt>🍳 직접 만들기</dt><dd>{recipeCost===null?'가격 미확인':`약 ${won(Math.round(recipeCost/100)*100)}`}</dd><span className="cook-choice-name">{recipeName}</span><small>기본 레시피 1인분 · 사용 재료비</small><small>⏱ 약 {minutes}{/분/.test(minutes)?'':'분'}<br/>{recipeCost===null?'일부 재료 가격 미확인':'재료를 통째로 사는 금액은 별도'}</small></div>
  </dl>
  <p className="cook-comparison-context">오늘 한 끼를 고르는 참고예요. 두 음식의 양과 영양은 달라요.</p>
 </>;
}
