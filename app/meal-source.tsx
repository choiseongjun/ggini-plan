'use client';
import {usePlannerLocale} from './planner-locale';
import type {PlanProduct} from '../lib/shopping-plan';
import {ProductThumb} from './product-thumb';
import './meal-source.css';

export function MealSourceBadge({product}:{product:PlanProduct}){
 const locale=usePlannerLocale();
 return <span className={`meal-source-badge ${product.recipe?'is-recipe':'is-product'}`}>{locale.text(product.recipe?'🍳 직접 만드는 요리':'🛍️ 판매 상품')}</span>;
}

export function RecipeProductPreview({product}:{product:PlanProduct}){
 if(!product.recipe)return null;
 return <div className="meal-source-ingredients" aria-label="요리에 쓰는 실제 재료 상품">
  <p>이 상품들로 만들어요 <span>사용량 기준</span></p>
  <ul>{product.recipe.ingredients.map(({product:p,label})=><li key={p.id}>
   {p.productUrl?<a href={p.productUrl} target="_blank" rel="noopener noreferrer" aria-label={`${label} · ${p.name} 상품 보기 (새 창)`}><ProductThumb item={p}/><span>{label}</span></a>:<span><ProductThumb item={p}/><span>{label}</span></span>}
  </li>)}</ul>
 </div>;
}
