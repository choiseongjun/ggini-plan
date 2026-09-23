'use client';
import {useState} from 'react';
import {ProductThumb} from './product-thumb';
import {RecipeEstimate} from './recipe-estimate';
import {MealChoiceCards} from './meal-choice-cards';
import {RecipeOfferPicker} from './recipe-offer-picker';
import {servingNutrition} from '../lib/food-intake';
import {matchesCookingAlternative} from '../lib/cooking-recipes';
import {basketTotal,slotCandidates,type PlanProduct,type PlanConditions,purchaseBasket} from '../lib/shopping-plan';
import './meal-comparison.css';
const won=(n:number)=>`${Math.round(n).toLocaleString('ko-KR')}원`;
function RecipeIngredients({product,conditions}:{product:PlanProduct;conditions:PlanConditions}){
 if(!product.recipe)return null;
 const rows=purchaseBasket([product.id],[product],conditions.owned,conditions.supply,undefined,conditions.people);
 const ungrouped=product.recipe.ingredients.filter(i=>!i.group);
 // Side-dish ingredients (밑반찬) come from a separately-generated approximate recipe of their own —
 // showing each raw ingredient reads as more precise than it actually is. Collapsed to just the side
 // dish's name; its price/nutrition still flow through the real ingredient products underneath.
 const groups=new Map<string,number>();
 for(const i of product.recipe.ingredients){if(!i.group)continue;groups.set(i.group,(groups.get(i.group)??0)+i.product.price*i.packs);}
 return <section className="recipe-products" aria-label={`${product.name} 실제 재료 상품`}>
  <h5>🧺 이 요리에 필요한 실제 재료</h5>
  <ul>{ungrouped.map((part,i)=>{
   const p=part.product,row=rows.find(r=>r.product.id===p.id)!;
   const available=conditions.owned.includes(p.id)?part.packs:conditions.supply?.[p.id]??0;
   return <li key={`${p.id}-${i}`}>
    <div className="recipe-product-title"><ProductThumb item={p}/><div><strong>{part.label}</strong>{p.productUrl?<a href={p.productUrl} target="_blank" rel="noopener noreferrer">{p.name} ↗</a>:<span>{p.name}</span>}</div></div>
    <span>{p.detail} · 판매 1묶음 {won(p.price)}</span>
    <dl><div><dt>이 한 끼에 쓰는 재료비</dt><dd>약 {won(p.price*part.packs)}</dd></div><div><dt>추가 구매</dt><dd>{row.packs?`${row.packs}묶음 · ${won(row.cost)}`:'0원 · 주문·보유 수량으로 준비'}</dd></div></dl>
    {available>0&&<small>주문·보유 수량을 먼저 반영했어요.</small>}
    {p.priceNote&&<small>{p.priceNote}</small>}
   </li>;
  })}
  {[...groups].map(([name,price])=><li key={name}><div className="recipe-product-title"><span className="food-thumb sand" aria-hidden="true">🥗</span><div><strong>{name} 밑반찬</strong></div></div><span>이 한 끼에 쓰는 재료비 약 {won(price)}</span></li>)}
  </ul>
  <p>필요한 양만 요리에 쓰고 남은 재료는 보관해요. 식단에 선택한 요리의 재료는 장바구니에서 한 번에 준비할 수 있어요.</p>
 </section>;
}
export function MealComparison({product,index,ids,products,conditions,onChoose,disabled}:{product:PlanProduct;index:number;ids:string[];products:PlanProduct[];conditions:PlanConditions;onChoose:(index:number,id:string)=>void;disabled:boolean}){
 const [open,setOpen]=useState(false);
 if(product.recipe?.assembly)return <details className="recipe-instructions"><summary>🍱 함께 먹는 상품 · 준비 방법</summary><RecipeIngredients product={product} conditions={conditions}/><ol>{product.recipe.steps.map(s=><li key={s}>{s}</li>)}</ol><small>구매는 판매 묶음 기준이며, 확인되지 않은 영양정보는 미확인으로 표시해요.</small></details>;
 const options=slotCandidates(products,{...conditions,cooking:'all',mealMode:'mixed'},index).filter(p=>!!p.recipe!==!!product.recipe&&matchesCookingAlternative(product,p)).map(p=>{
  const next=ids.map((id,i)=>i===index?p.id:id);
  return {product:p,total:basketTotal(next,products,conditions.owned,conditions.supply,conditions.people),one:basketTotal([p.id],products,conditions.owned,conditions.supply,conditions.people)};
 }).sort((a,b)=>a.total-b.total||a.product.price/a.product.servings-b.product.price/b.product.servings).slice(0,3);
 const current=basketTotal(ids,products,conditions.owned,conditions.supply,conditions.people);
 return <div className="meal-comparison">
  <RecipeOfferPicker product={product} index={index} ids={ids} products={products} conditions={conditions} onChoose={onChoose} disabled={disabled}/>
  {product.recipe&&<details className="recipe-instructions"><summary>🍳 약 {product.recipe.minutes}분 · 재료와 만드는 법</summary><RecipeIngredients product={product} conditions={conditions}/><ol>{product.recipe.steps.map(s=><li key={s}>{s}</li>)}</ol><small>참고용 조합입니다. 실제 조리법은 재료별로 통상적인 방식을 따르세요.</small></details>}
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
 const rows=purchaseBasket(ids,products,conditions.owned,conditions.supply,undefined,conditions.people);
 return <p>같은 재료는 합쳐서 구매해요. 새로 살 상품 {rows.filter(r=>r.packs>0).length}종 · 남는 재료는 다음 끼니에도 사용할 수 있어요.</p>;
}
