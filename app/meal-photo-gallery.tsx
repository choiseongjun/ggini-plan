'use client';

import Image from 'next/image';
import {useEffect,useState} from 'react';
import type {PlanProduct} from '../lib/shopping-plan';
import {reviewedRecipeImages} from '../lib/reviewed-recipe-images';
import './meal-photo-gallery.css';

export function MealPhotoGallery({product}:{product:PlanProduct}) {
 const [failed,setFailed]=useState<string[]>([]);
 const [searched,setSearched]=useState<{thumbnail:string;link:string}[]>([]);
 useEffect(()=>{
  const controller=new AbortController();
  fetch(`/api/menu-photos?name=${encodeURIComponent(product.name)}`,{signal:controller.signal})
   .then(async response=>{if(!response.ok)return;const data=await response.json();if(Array.isArray(data.images))setSearched(data.images);})
   .catch(()=>{/* Existing photos remain available if search fails. */});
  return()=>controller.abort();
 },[product.name]);
 const reviewed=reviewedRecipeImages(undefined,product.productImageUrl);
 const validSearch=searched.filter(image=>!failed.includes(image.thumbnail));
 const photos=[...new Set(validSearch.length?validSearch.map(image=>image.thumbnail):reviewed??[product.productImageUrl,...(product.productImageUrls??[])])]
  .filter((url):url is string=>typeof url==='string'&&/^https?:\/\//.test(url)&&!failed.includes(url));
 return <section className="meal-photo-gallery" aria-label={`${product.name} 참고 사진`}>
  <div className="meal-photo-gallery-heading"><strong>메뉴 사진</strong><span>{photos.length}장</span></div>
  {photos.length?<><p>{validSearch.length?'네이버 이미지 검색 결과예요. ':'같은 메뉴의 다양한 모습을 참고해 보세요. '}사진 속 재료와 양은 추천 식단과 다를 수 있어요.</p>
   <div className="meal-photo-gallery-grid">{photos.map((src,index)=><a key={src} href={validSearch.find(image=>image.thumbnail===src)?.link??src} target="_blank" rel="noopener noreferrer" aria-label={`${product.name} 참고 사진 ${index+1} 크게 보기 (새 창)`}>
    <Image src={src} alt={`${product.name} 참고 사진 ${index+1}`} width={480} height={360} unoptimized loading="lazy" onError={()=>setFailed(previous=>[...previous,src])}/>
    <span>사진 {index+1} · 크게 보기</span>
   </a>)}</div></>:<p>아직 준비된 사진이 없어요. 아래에서 재료와 만드는 방법을 확인해 주세요.</p>}
 </section>;
}
