'use client';
import {useEffect, useState} from 'react';

type Product = {id: string; name: string; price: number; productUrl: string | null};

export function RecipeIngredientProducts({ingredientNames}: {ingredientNames: string[]}) {
 const [products, setProducts] = useState<Product[] | null>(null);
 const key = ingredientNames.join('|');
 useEffect(() => {
  if (!ingredientNames.length) return;
  let active = true;
  fetch(`/api/recipe-ingredient-products?names=${encodeURIComponent(ingredientNames.join(','))}`, {cache: 'no-store'})
   .then((r) => r.json()).then((d) => { if (active) setProducts(d.products ?? []); })
   .catch(() => { if (active) setProducts([]); });
  return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [key]);
 if (!ingredientNames.length || !products?.length) return null;
 return <section className="recipe-ingredient-products" aria-label="이 요리 재료로 살 수 있는 실제 상품">
  <p>🛒 이 재료로 살 수 있는 실제 상품 <span>이름이 비슷한 상품이에요 · 실제 이 레시피와 구성이 다를 수 있어요</span></p>
  <ul>{products.map((p) => <li key={p.id}>{p.productUrl ? <a href={p.productUrl} target="_blank" rel="noopener noreferrer">{p.name} ↗</a> : <span>{p.name}</span>} · {p.price.toLocaleString('ko-KR')}원</li>)}</ul>
 </section>;
}
