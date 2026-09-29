'use client';
import {useEffect, useState} from 'react';
import Image from 'next/image';

type Product = {id: string; name: string; price: number; productUrl: string | null; productImageUrl: string | null};

function Thumb({product}: {product: Product}) {
 const [failed, setFailed] = useState(false);
 if (!product.productImageUrl || failed) return <span className="food-thumb sand" aria-hidden="true">🛒</span>;
 return <span className="food-thumb sand"><Image src={product.productImageUrl} alt="" width={40} height={40} unoptimized onError={() => setFailed(true)}/></span>;
}

export function RecipeIngredientProducts({ingredientNames}: {ingredientNames: string[]}) {
 const [result, setResult] = useState<{key:string;products:Product[]}|null>(null);
 const key = ingredientNames.join('|');
 useEffect(() => {
  if (!ingredientNames.length) return;
  let active = true;
  fetch(`/api/recipe-ingredient-products?v=2&names=${encodeURIComponent(ingredientNames.join(','))}`, {cache: 'no-store'})
   .then((r) => r.json()).then((d) => { if (active) setResult({key,products:d.products ?? []}); })
   .catch(() => { if (active) setResult({key,products:[]}); });
  return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [key]);
 const products=result?.key===key?result.products:[];
 if (!ingredientNames.length || !products.length) return null;
 return <section className="meal-source-ingredients recipe-ingredient-products" aria-label="이 요리 재료로 살 수 있는 실제 상품">
  <p>🛒 이 재료로 살 수 있는 실제 상품 <span>재료명과 식재료 분류가 일치하는 상품이에요 · 용량·손질 상태는 판매처에서 확인해 주세요</span></p>
  <ul>{products.map((p) => <li key={p.id}>
   {p.productUrl
    ? <a href={p.productUrl} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} 상품 보기 (새 창)`}><Thumb product={p}/><span>{p.name}</span><span>{p.price.toLocaleString('ko-KR')}원</span></a>
    : <span><Thumb product={p}/><span>{p.name}</span><span>{p.price.toLocaleString('ko-KR')}원</span></span>}
  </li>)}</ul>
 </section>;
}
