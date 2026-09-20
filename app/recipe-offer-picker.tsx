'use client';
import {slotCandidates,basketTotal,type PlanProduct,type PlanConditions} from '../lib/shopping-plan';
import {ProductThumb} from './product-thumb';
import './recipe-offer-picker.css';
const won=(n:number)=>`${Math.round(n).toLocaleString('ko-KR')}원`;
export function RecipeOfferPicker({product,index,ids,products,conditions,onChoose,disabled}:{product:PlanProduct;index:number;ids:string[];products:PlanProduct[];conditions:PlanConditions;onChoose:(index:number,id:string)=>void;disabled:boolean}){
 if(!product.recipe)return null;
 const options=slotCandidates(products,{...conditions,mealMode:'cook'},index).filter(p=>p.recipe&&p.id.split('--with--')[0]===product.id.split('--with--')[0]);
 return <details className="recipe-offer-picker"><summary>🧺 재료 상품·가격 비교</summary><p>대체 가능한 등록 상품끼리 비교해요. 배송비·쿠폰 별도이며 실시간 가격은 아니에요.</p>
 {product.recipe.ingredients.map((part,partIndex)=>{
  const choices=options.filter(p=>p.recipe!.ingredients.every((other,i)=>i===partIndex||other.product.id===product.recipe!.ingredients[i].product.id));
  return <fieldset key={partIndex}><legend>{part.label}</legend>{choices.length<2&&<small>확인된 상품 1종 · 대체 상품 준비 중</small>}
   {choices.map(candidate=>{const entry=candidate.recipe!.ingredients[partIndex],p=entry.product,grams=p.servingGrams,selected=p.id===part.product.id,next=ids.map((id,i)=>i===index?candidate.id:id),total=basketTotal(next,products,conditions.owned,conditions.supply,conditions.people);return <div className="recipe-offer" key={candidate.id}>
    <div><ProductThumb item={p}/><a href={p.productUrl!} target="_blank" rel="noopener noreferrer">{p.name} ↗</a></div>
    <small>{p.detail} · 판매 {won(p.price)}{/달걀/.test(part.label)?` · 1개당 ${won(p.price/p.quantity)}`:grams?` · 100g당 ${won(p.price/grams*100)}`:''}</small>
    <strong>사용분 {won(p.price*entry.packs)}</strong><small>가격 확인 {p.priceCheckedAt?.slice(0,10)??'미확인'}</small>
    {!selected&&<small>선택하면 한 끼 {won(candidate.price)} · 전체 장보기 {won(total)}</small>}
    <button type="button" aria-pressed={selected} disabled={disabled||selected||total>conditions.budget} onClick={()=>onChoose(index,candidate.id)}>{selected?'선택한 상품 ✓':total>conditions.budget?'예산을 초과해요':'이 상품으로 바꾸기'}</button>
   </div>;})}
  </fieldset>;
 })}<small>상품을 바꾸면 이 끼니의 재료와 구매 목록이 바뀝니다. 재료 구성·영양은 상품마다 달라요.</small></details>;
}
