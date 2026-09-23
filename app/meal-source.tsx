'use client';
import {usePlannerLocale} from './planner-locale';
import type {PlanProduct} from '../lib/shopping-plan';
import {ProductThumb} from './product-thumb';
import './meal-source.css';
import {RecipeVideos} from './recipe-videos';
import {RecipeIngredientProducts} from './recipe-ingredient-products';

export function MealSourceBadge({product}:{product:PlanProduct}){
 const locale=usePlannerLocale();
 return <span className={`meal-source-badge ${product.recipe?'is-recipe':'is-product'}`}>{locale.text(product.recipe?.assembly?'🍱 상품으로 차린 한 끼':product.recipe?'🍳 직접 만드는 요리':'🛍️ 판매 상품')}</span>;
}

export function RecipeProductPreview({product}:{product:PlanProduct}){
 if(!product.recipe)return null;
 // Government-DB recipes (not assembly) approximate nutrition from ~26 generic raw ingredients —
 // it has no notion of what a specific dish actually needs (미트볼 needs egg/breadcrumbs as a binder;
 // the optimizer just picks whatever hits the calorie/protein target). Listing exact grams for these
 // reads as far more precise than it is, so it's not shown at all — only real, priced products
 // (assembly=true) get an itemized ingredient list here.
 if(!product.recipe.assembly)return <div className="meal-source-ingredients" aria-label="요리 참고 정보">
  <RecipeVideos key={product.id} dishId={product.id}/>
  <RecipeIngredientProducts key={`ing-products-${product.id}`} ingredientNames={[...new Set(product.recipe.ingredients.map(({product:p})=>p.name))].slice(0,8)}/>
 </div>;
 return <div className="meal-source-ingredients" aria-label="요리에 쓰는 실제 재료 상품">
  <p>이 상품들을 함께 먹어요 <span>사용량 기준</span></p>
  <ul>{product.recipe.ingredients.map(({product:p,label},i)=><li key={`${p.id}-${i}`}>
   {p.productUrl?<a href={p.productUrl} target="_blank" rel="noopener noreferrer" aria-label={`${label} · ${p.name} 상품 보기 (새 창)`}><ProductThumb item={p}/><span>{label}</span></a>:<span><ProductThumb item={p}/><span>{label}</span></span>}
  </li>)}</ul>
 </div>;
}
