'use client';
import {useState} from 'react';
import Link from 'next/link';
import {RecipeVideos} from './recipe-videos';
import type {PlanProduct} from '../lib/shopping-plan';
import {isPantrySeasoning,pantryShortage} from '../lib/pantry-recommendation';
import {PantryCookingGuide} from './pantry-cooking-guide';
import {Icon} from './app-shell';
import {MealPhotoGallery} from './meal-photo-gallery';

export function PantryMenuDetails({product,owned,onClose,onSelect}:{product:PlanProduct;owned:string[];onClose:()=>void;onSelect:()=>void}){
 const [showPhotos,setShowPhotos]=useState(false),[showVideos,setShowVideos]=useState(false);
 const hasPantry=owned.some(name=>!isPantrySeasoning(name));
 const shortage=pantryShortage(product,owned);
 return <div className="pantry-menu-details">
   {hasPantry&&shortage.main.length>0&&<p className="pantry-shortage">더 필요해요: {shortage.main.join(' · ')}</p>}
   {hasPantry&&shortage.seasonings.length>0&&<p className="pantry-muted">양념 확인: {shortage.seasonings.join(' · ')}</p>}
   <details className="pantry-menu-sides" onToggle={event=>setShowPhotos(event.currentTarget.open)}><summary>사진 여러 장 보기 · 참고 사진</summary>{showPhotos&&<MealPhotoGallery product={product}/>}</details>
   {product.sourceRecipe?<PantryCookingGuide key={product.id} product={product}/>:<section><h3>필요한 재료</h3><ul>{product.recipe?.ingredients.map((i,index)=><li key={index}>{i.label}</li>)}</ul><p className="pantry-muted">등록된 메뉴의 예상 재료·분량이에요. 실제 조리법과 분량은 선택한 영상에서 확인해 주세요.</p><details className="pantry-menu-sides" onToggle={e=>setShowVideos(e.currentTarget.open)}><summary>만드는 방법 · 영상 보기</summary>{showVideos&&<RecipeVideos dishId={product.id} compact/>}</details></section>}
  <div className="pantry-menu-actions">{product.sourceRecipe?<button type="button" className="pantry-primary" onClick={onSelect}>이거 만들기<Icon name="check" size={17}/></button>:<Link href="/record">먹은 메뉴 기록하러 가기 →</Link>}<button type="button" onClick={onClose}>상세정보 접기</button></div>
 </div>;
}
