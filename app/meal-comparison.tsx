'use client';
import {useState} from 'react';
import {ProductThumb} from './product-thumb';
import {RecipeEstimate} from './recipe-estimate';
import {MealChoiceCards} from './meal-choice-cards';
import {servingNutrition} from '../lib/food-intake';
import {matchesCookingAlternative} from '../lib/cooking-recipes';
import {basketTotal,slotCandidates,type PlanProduct,type PlanConditions,purchaseBasket} from '../lib/shopping-plan';
import './meal-comparison.css';
const won=(n:number)=>`${Math.round(n).toLocaleString('ko-KR')}원`;
function RecipeIngredients({product,conditions}:{product:PlanProduct;conditions:PlanConditions}){
 if(!product.recipe)return null;
 const rows=purchaseBasket([product.id],[product],conditions.owned,conditions.supply);
 return <section className="recipe-products" aria-label={`${product.name} 실제 재료 상품`}>
  <h5>🧺 이 요리에 필요한 실제 재료</h5>
  <ul>{product.recipe.ingredients.map(part=>{
   const p=part.product,row=rows.find(r=>r.product.id===p.id)!;
   const available=conditions.owned.includes(p.id)?part.packs:conditions.supply?.[p.id]??0;
   return <li key={p.id}>
    <div className="recipe-product-title"><ProductThumb item={p}/><div><strong>{part.label}</strong><a href={p.productUrl!} target="_blank" rel="noopener noreferrer">{p.name} ↗</a></div></div>
    <span>{p.detail} · 판매 1묶음 {won(p.price)}</span>
    <dl><div><dt>이 한 끼에 쓰는 재료비</dt><dd>약 {won(p.price*part.packs)}</dd></div><div><dt>추가 구매</dt><dd>{row.packs?`${row.packs}묶음 · ${won(row.cost)}`:'0원 · 주문·보유 수량으로 준비'}</dd></div></dl>
    {available>0&&<small>주문·보유 수량을 먼저 반영했어요.</small>}
    {p.priceNote&&<small>{p.priceNote}</small>}
   </li>;
  })}</ul>
  <p>필요한 양만 요리에 쓰고 남은 재료는 보관해요. 식단에 선택한 요리의 재료는 장바구니에서 한 번에 준비할 수 있어요.</p>
 </section>;
}
export function MealComparison({product,index,ids,products,conditions,onChoose,disabled}:{product:PlanProduct;index:number;ids:string[];products:PlanProduct[];conditions:PlanConditions;onChoose:(index:number,id:string)=>void;disabled:boolean}){
 const [open,setOpen]=useState(false);
 const options=slotCandidates(products,{...conditions,cooking:'all',mealMode:'mixed'},index).filter(p=>!!p.recipe!==!!product.recipe&&matchesCookingAlternative(product,p)).map(p=>{
  const next=ids.map((id,i)=>i===index?p.id:id);
  return {product:p,total:basketTotal(next,products,conditions.owned,conditions.supply),one:basketTotal([p.id],products,conditions.owned,conditions.supply)};
 }).sort((a,b)=>a.total-b.total||a.product.price/a.product.servings-b.product.price/b.product.servings).slice(0,3);
 const current=basketTotal(ids,products,conditions.owned,conditions.supply);
 return <div className="meal-comparison">
  {product.recipe&&<details className="recipe-instructions"><summary>🍳 약 {product.recipe.minutes}분 · 재료와 만드는 법</summary><RecipeIngredients product={product} conditions={conditions}/><ol>{product.recipe.steps.map(s=><li key={s}>{s}</li>)}</ol><small>기본 재료와 물만으로 만드는 구성입니다. 양념을 더하면 비용·영양은 별도예요. 영양은 등록된 재료값의 합산 예상치예요.</small></details>}
  <button type="button" aria-expanded={open} onClick={()=>setOpen(!open)}>{product.recipe?'🛍️ 간편식으로 먹으면?':'🍳 직접 만들면?'}</button>
  {open&&<section className="cook-comparison-panel" aria-label="한 끼 선택지 비교">{options.length>0&&<p><strong>오늘 한 끼, 어떻게 먹을까요?</strong></p>}
   {!options.length?(product.recipe?<p>이 요리의 주재료에 맞는 간편식이 아직 연결되지 않았어요.</p>:<RecipeEstimate key={product.id} product={product} conditions={conditions}/>):options.map(({product:p,total,one})=>{const n=servingNutrition(p);return <article key={p.id}>
    <MealChoiceCards ready={p.recipe?product:p} recipeName={p.recipe?p.name:product.name} recipeCost={p.recipe?p.price/p.servings:product.price/product.servings} minutes={String((p.recipe??product.recipe)!.minutes)}/>
    <details className="cook-shopping-details"><summary>바꾸면 필요한 장보기</summary><div className="cook-shopping-body">
    <dl><div><dt>이 끼니만 추가 구매</dt><dd>{won(one)}</dd></div><div><dt>교체 후 전체 장보기</dt><dd>{won(total)}</dd></div></dl>
    {p.recipe&&<><small>레시피 영양 예상 · {n.calories===null?'칼로리 미확인':`${Math.round(n.calories)} kcal`} · 단백질 {n.protein===null?'미확인':`${Math.round(n.protein)}g`}</small><RecipeIngredients product={p} conditions={conditions}/></>}
    </div></details>
    <p>{total===current?'전체 구매 금액이 같아요':total<current?`전체 구매에서 ${won(current-total)} 줄어요`:`전체 구매에 ${won(total-current)} 더 필요해요`}</p>
    <button type="button" disabled={disabled||total>conditions.budget} onClick={()=>{onChoose(index,p.id);setOpen(false);}}>{total>conditions.budget?`예산보다 ${won(total-conditions.budget)} 많아요`:p.recipe?'이 요리로 바꾸고 재료 담기':'이 메뉴로 바꾸기'}</button>
   </article>;})}
   {options.length>0&&<small>등록 판매 묶음과 주문·보유 수량 기준 · 배송비 별도. 다른 끼니와 겹치는 재료는 전체 장보기에서 합쳐요.</small>}
  </section>}
 </div>;
}

export function RecipePurchaseNote({ids,products,conditions}:{ids:string[];products:PlanProduct[];conditions:PlanConditions}){
 const rows=purchaseBasket(ids,products,conditions.owned,conditions.supply);
 return <p>같은 재료는 합쳐서 구매해요. 새로 살 상품 {rows.filter(r=>r.packs>0).length}종 · 남는 재료는 다음 끼니에도 사용할 수 있어요.</p>;
}
