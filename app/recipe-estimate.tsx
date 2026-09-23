'use client';
import {useEffect,useState} from 'react';
import {allowedEstimateRecipes} from '../lib/recipe-estimates';
import {compareRecipeProducts} from '../lib/recipe-product-comparison';
import {MealChoiceCards} from './meal-choice-cards';
import type {CatalogItem} from '../lib/catalog';
import type {PlanProduct,PlanConditions} from '../lib/shopping-plan';
const won=(n:number)=>`${Math.round(n).toLocaleString('ko-KR')}원`;
const ingredientEmoji:Record<string,string>={rice:'🍚',beef:'🥩',mushroom:'🍄',onion:'🧅',carrot:'🥕',egg:'🥚',shrimp:'🦐',chicken:'🍗',pumpkin:'🎃',pasta:'🍝',tomatoSauce:'🍅',milk:'🥛',cheese:'🧀'};
export function RecipeEstimate({product,conditions}:{product:PlanProduct;conditions:PlanConditions}){
 const recipes=allowedEstimateRecipes(conditions);
 const suggested=recipes.find(r=>r.match.test(product.name));
 const [selected,setSelected]=useState(suggested?.id??'');
 const [catalog,setCatalog]=useState<CatalogItem[]>([]),[status,setStatus]=useState('등록된 재료 상품을 불러오는 중이에요.');
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/catalog',{signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error();const data=await response.json();if(!Array.isArray(data.items))throw new Error();if(!controller.signal.aborted){setCatalog(data.items);setStatus('');}}).catch(()=>{if(!controller.signal.aborted)setStatus('재료 상품을 불러오지 못했어요. 가격은 미확인으로 표시해요.');});
  return ()=>controller.abort();
 },[]);
 const recipe=recipes.find(r=>r.id===selected),estimate=recipe?compareRecipeProducts(recipe,catalog,conditions):null;
 return <article className="recipe-estimate" aria-label="한 끼 선택지 비교">
  <header className="cook-heading"><span className="cook-mascot" aria-hidden="true">🍳</span><div><h4>오늘 한 끼, 어떻게 먹을까요?</h4><p>간편하게 사 먹기 · 직접 만들어 먹기</p></div></header>
  {status&&<p role="status">{status}</p>}
  <details className="cook-recipe-change" open={!recipe}><summary>다른 레시피 선택</summary><label className="cook-recipe-select">비교할 레시피<select aria-label="비교할 레시피" value={recipe?.id??''} onChange={e=>{setSelected(e.target.value);}}><option value="">레시피 선택</option>{recipes.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label></details>
  {!recipes.length&&<p>현재 피할 재료 조건을 통과한 기본 레시피가 없어요.</p>}
  {!recipe&&recipes.length>0&&<p>이 상품과 같은 레시피는 아직 없어요. 비교해 보고 싶은 기본 요리를 선택해 주세요.</p>}
  {recipe&&estimate&&<>
   <MealChoiceCards ready={product} recipeName={recipe.name} recipeCost={estimate.usedTotal}/>
   <p className="cook-simple-ingredients"><strong>이런 재료로 만들어요</strong>{estimate.rows.map(r=>r.name).join(' · ')}</p>
   <details className="cook-method"><summary><span>만드는 법</span><span aria-hidden="true">＋</span></summary><small>1인분 기준 · 상품과 분량·맛·영양은 다를 수 있어요.</small><ol>{recipe.steps.map(step=><li key={step}>{step}</li>)}</ol></details>
   <details className="cook-shopping-details"><summary><span>한 끼 재료비 보기</span><span aria-hidden="true">＋</span></summary><div className="cook-shopping-body">
   <small>레시피 1인분에 쓰는 양만 계산해요. 집에 있는 재료도 사용분 비용에 포함해요.</small>
   <section className="recipe-products cook-ingredients"><ul>{estimate.rows.map(r=><li key={r.id}>
    <div className="cook-ingredient-top"><span className="cook-ingredient-icon" aria-hidden="true">{ingredientEmoji[r.id]??'🧂'}</span><div><strong>{r.name}</strong><small>{r.amount}{r.unit} 사용</small></div><strong>{r.usedCost===null?'미확인':`약 ${won(r.usedCost)}`}</strong></div>
    <details className="cook-cost-detail"><summary>상품·가격 자세히</summary><div><span>{r.usedCost===null?'사용분 비용 미확인':`사용분 약 ${won(r.usedCost)}`}</span>
    {r.product?<><a href={r.product.productUrl!} target="_blank" rel="noopener noreferrer">{r.product.name} ↗</a><small>판매 1묶음 · {r.pack}{r.unit} / {won(r.product.price)} · 가격 확인 {r.product.priceCheckedAt!.slice(0,10)}</small><small>{r.amount}{r.unit} ÷ {r.pack}{r.unit} × {won(r.product.price)} = 사용분 약 {won(r.usedCost!)}</small>{r.product.priceNote&&<small>{r.product.priceNote}</small>}</>:<small>판매 용량과 가격 근거가 연결되지 않았어요. 비용·구매 묶음 수·남는 양을 임의로 계산하지 않아요.</small>}
    </div></details>
   </li>)}</ul></section>
   <details className="cook-footnote"><summary>금액은 어떻게 계산하나요?</summary><p>상품 URL·판매 용량·가격 확인일이 있는 등록 상품 {estimate.linked}종만 계산합니다. 미확인 가격은 0원이 아니며 소계에서 제외합니다. 실시간 판매가는 아니며 배송비·가스·전기는 별도예요.</p><p>{recipe.source.note} 분량·맛·영양이 다를 수 있어요. 조리 시간은 1인분 기준입니다. 한 끼 사용량으로 환산한 비교 금액이며, 실제 구매 목록·식비·섭취 기록에는 자동 반영하지 않아요.</p></details>
   </div></details>
  </>}
 </article>;
}
