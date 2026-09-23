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

const won=(n:number)=>`${Math.round(n).toLocaleString('ko-KR')}원`;

export function RecipeProductPreview({product,videos=true}:{product:PlanProduct;videos?:boolean}){
 if(!product.recipe)return null;
 const ungrouped=product.recipe.ingredients.filter(i=>!i.group);
 // Side-dish ingredients (밑반찬) come from a separately-generated recipe of their own — showing
 // each raw ingredient reads as more precise than it needs to be. Collapsed to just the side dish's
 // name; its price/nutrition still flow through the real ingredient products underneath.
 const groups=new Map<string,number>();
 for(const i of product.recipe.ingredients){if(!i.group)continue;groups.set(i.group,(groups.get(i.group)??0)+i.product.price*i.packs);}
 return <div className="meal-source-ingredients" aria-label="요리에 쓰는 실제 재료 상품">
  <p>{product.recipe.assembly?'이 상품들을 함께 먹어요':'이 재료로 만들어요'} <span>1인분 · 쓰는 양 기준 가격</span></p>
  {/* 재료마다 쓰는 양과 그만큼의 예상 가격. 통째로 산 포장값이 아니라 g당 가격 × 사용량이에요. */}
  <ul className="ingredient-cost-list">{ungrouped.map(({product:p,label,packs},i)=>{
   const name=label.replace(/\s*\(기본 양념\)$/,'');const pantry=p.price===0;
   const body=<><ProductThumb item={p}/><span className="ingredient-cost-name">{name}</span><b className={pantry?'is-pantry':undefined}>{pantry?'기본 양념':`약 ${won(p.price*packs)}`}</b></>;
   return <li key={`${p.id}-${i}`}>{p.productUrl?<a href={p.productUrl} target="_blank" rel="noopener noreferrer" aria-label={`${name} · ${p.name} 상품 보기 (새 창)`}>{body}</a>:<span>{body}</span>}</li>;})}
  {[...groups].map(([name,price])=><li key={name}><span><span className="food-thumb sand" aria-hidden="true">🥗</span><span className="ingredient-cost-name">{name} 밑반찬</span><b>약 {won(price)}</b></span></li>)}
  </ul>
  <p className="ingredient-cost-total"><span>재료비 합계</span><b>약 {won(product.price)}</b></p>
  <small className="ingredient-cost-note">g당 예상 소매가 × 쓰는 양으로 계산했어요. 간장·된장·식용유 같은 기본 양념은 집에 있다고 보고 빼요.</small>
  {videos&&!product.recipe.assembly&&<RecipeVideos key={product.id} dishId={product.id}/>}
  {!product.recipe.assembly&&<RecipeIngredientProducts key={`ing-products-${product.id}`} ingredientNames={[...new Set(product.recipe.ingredients.map(({product:p})=>p.name))].slice(0,8)}/>}
 </div>;
}
