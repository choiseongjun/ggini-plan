'use client';

import {useState} from 'react';
import {initialConditions,type PlanProduct} from '../lib/shopping-plan';
import {pantryShortage} from '../lib/pantry-recommendation';
import {MealPhotoGallery,MealCompositionPhotos} from './meal-photo-gallery';
import {RecipeProductPreview} from './meal-source';
import {ProductNutrition} from './recommendation-nutrition';
import {RecipeVideos} from './recipe-videos';
import {SideDishSuggest} from './side-dish-suggest';
import {PlanEngineContext,remoteEngine} from './plan-engine';
import {Icon} from './app-shell';

const detailsEngine=remoteEngine(()=>{});

export function PantryMenuDetails({product,owned,onClose,onSelect}:{product:PlanProduct;owned:string[];onClose:()=>void;onSelect:()=>void}){
 const [showSides,setShowSides]=useState(false);
 const shortage=pantryShortage(product,owned);
 return <div className="pantry-menu-details">
   {product.recipe?.sides?.length?<MealCompositionPhotos product={product}/>:<MealPhotoGallery product={product}/>}
   <section className="pantry-menu-section" aria-label="재료와 분량">
    <h3>재료와 분량</h3>
    {shortage.main.length>0&&<p className="pantry-shortage">더 필요해요: {shortage.main.join(' · ')}</p>}
    {shortage.seasonings.length>0&&<p className="pantry-muted">양념 확인: {shortage.seasonings.join(' · ')}</p>}
    <RecipeProductPreview product={product} videos={false}/>
   </section>
   <section className="pantry-menu-section" aria-label="영양정보"><h3>영양정보</h3><ProductNutrition product={product}/></section>
   <section className="pantry-menu-section" aria-label="만드는 법 참고"><h3>만드는 법 참고</h3><RecipeVideos dishId={product.id} compact/></section>
   <details className="pantry-menu-sides" onToggle={event=>setShowSides(event.currentTarget.open)}><summary>함께 먹을 곁들임 추천</summary>{showSides&&<PlanEngineContext.Provider value={detailsEngine}><SideDishSuggest main={product} conditions={{...initialConditions,days:1,meals:1,slots:['dinner'],mealMode:'cook'}}/></PlanEngineContext.Provider>}</details>
   <section className="pantry-menu-section pantry-menu-source" aria-label="메뉴 구성과 출처"><h3>메뉴 구성·출처</h3><p>{product.detail}</p>{product.recipe?.steps.filter(Boolean).map((step,index)=><p key={index}>{step}</p>)}</section>
  <div className="pantry-menu-actions"><button type="button" className="pantry-primary" onClick={onSelect}>이 메뉴로 고르기<Icon name="check" size={17}/></button><button type="button" onClick={onClose}>상세정보 접기</button></div>
 </div>;
}
