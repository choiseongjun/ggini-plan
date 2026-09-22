"use client";
import {useState} from 'react';

type Reference = {foodCode: string; name: string; caloriesKcal: number | null; carbohydratesG: number | null; proteinG: number | null; fatG: number | null; sodiumMg: number | null};
type Product = {id: string; name: string; price: number; productUrl: string | null};
type Insight = {reference: Reference | null; substitutes: Reference[]; products: Product[]};

export function DishNutritionInsight({productId, productName}: {productId: string; productName: string}) {
 const [data, setData] = useState<Insight | null>(null);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState('');
 async function load() {
  if (data || loading) return;
  setLoading(true); setError('');
  try {
   const r = await fetch(`/api/nutrition-insight?name=${encodeURIComponent(productName)}&id=${encodeURIComponent(productId)}`, {cache: 'no-store'});
   const json = await r.json();
   if (!r.ok) throw new Error(json.error);
   setData(json);
  } catch (e) { setError(e instanceof Error ? e.message : '비교 정보를 불러오지 못했어요.'); }
  finally { setLoading(false); }
 }
 return <details className="dish-nutrition-insight" onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) void load(); }}>
  <summary>🔍 비슷한 음식과 비교</summary>
  {loading && <p>불러오는 중…</p>}
  {error && <p role="alert">{error}</p>}
  {data && !data.reference && <p className="body-note">참고할 만한 정부DB 데이터를 찾지 못했어요.</p>}
  {data?.reference && <div className="dish-nutrition-insight-body">
   <p>정부 식품영양성분DB · <strong>{data.reference.name}</strong> 참고 · 100g/100ml 기준 · 실제 상품과 다를 수 있어요</p>
   <small>열량 {data.reference.caloriesKcal ?? '-'}kcal · 탄수 {data.reference.carbohydratesG ?? '-'}g · 단백 {data.reference.proteinG ?? '-'}g · 지방 {data.reference.fatG ?? '-'}g · 나트륨 {data.reference.sodiumMg ?? '-'}mg</small>
   {data.products.length > 0 && <div className="dish-nutrition-insight-products">
    <p>🛍️ 비슷한 실제 상품</p>
    <ul>{data.products.map((p) => <li key={p.id}>{p.productUrl ? <a href={p.productUrl} target="_blank" rel="noopener noreferrer">{p.name} ↗</a> : <span>{p.name}</span>} · {p.price.toLocaleString('ko-KR')}원</li>)}</ul>
   </div>}
  </div>}
 </details>;
}
