'use client';
import {useState} from 'react';
import type {PlanProduct} from '../lib/shopping-plan';
import {pantryShortage} from '../lib/pantry-recommendation';
import {PantryCookingGuide} from './pantry-cooking-guide';
import {Icon} from './app-shell';
import {MealPhotoGallery} from './meal-photo-gallery';

export function PantryMenuDetails({product,owned,onClose,onSelect}:{product:PlanProduct;owned:string[];onClose:()=>void;onSelect:()=>void}){
 const [showPhotos,setShowPhotos]=useState(false);
 const shortage=pantryShortage(product,owned);
 return <div className="pantry-menu-details">
   <div className="pantry-menu-actions"><button type="button" className="pantry-primary" onClick={onSelect}>이 메뉴로 요리 시작<Icon name="check" size={17}/></button></div>
   {shortage.main.length>0&&<p className="pantry-shortage">더 필요해요: {shortage.main.join(' · ')}</p>}
   {shortage.seasonings.length>0&&<p className="pantry-muted">양념 확인: {shortage.seasonings.join(' · ')}</p>}
   <details className="pantry-menu-sides" onToggle={event=>setShowPhotos(event.currentTarget.open)}><summary>사진 여러 장 보기 · 참고 사진</summary>{showPhotos&&<MealPhotoGallery product={product}/>}</details>
   <PantryCookingGuide key={product.id} product={product}/>
  <div className="pantry-menu-actions"><button type="button" className="pantry-primary" onClick={onSelect}>이 메뉴로 요리 시작<Icon name="check" size={17}/></button><button type="button" onClick={onClose}>상세정보 접기</button></div>
 </div>;
}
