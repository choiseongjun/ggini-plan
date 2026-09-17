'use client';
import {useEffect,useState} from 'react';
import {allowedEstimateRecipes} from '../lib/recipe-estimates';
import {compareRecipeProducts} from '../lib/recipe-product-comparison';
import type {CatalogItem} from '../lib/catalog';
import type {PlanProduct,PlanConditions} from '../lib/shopping-plan';
const won=(n:number)=>`${Math.round(n).toLocaleString('ko-KR')}원`;
const range=(low:number,high:number)=>low===high?won(low):`${won(low)} ~ ${won(high)}`;
export function RecipeEstimate({product,conditions}:{product:PlanProduct;conditions:PlanConditions}){
 const recipes=allowedEstimateRecipes(conditions);
 const suggested=recipes.find(r=>r.match.test(product.name));
 const [selected,setSelected]=useState(suggested?.id??'');
 const [owned,setOwned]=useState<string[]>([]);
 const [catalog,setCatalog]=useState<CatalogItem[]>([]),[status,setStatus]=useState('등록된 재료 상품을 불러오는 중이에요.'),[servings,setServings]=useState(1);
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/catalog',{signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error();const data=await response.json();if(!Array.isArray(data.items))throw new Error();if(!controller.signal.aborted){setCatalog(data.items);setStatus('');}}).catch(()=>{if(!controller.signal.aborted)setStatus('재료 상품을 불러오지 못해 예상 가격으로 비교해요.');});
  return ()=>controller.abort();
 },[]);
 const recipe=recipes.find(r=>r.id===selected),estimate=recipe?compareRecipeProducts(recipe,catalog,conditions,owned,servings):null;
 return <article className="recipe-estimate" aria-label="레시피 예상 금액 비교">
  <strong>🍳 원재료로 비교해요</strong><span>등록 상품 가격 + 미연결 재료 예상가 · 실시간 판매가 아님</span>
  <p>레시피에 맞는 상품은 등록 가격을 사용하고, 아직 연결되지 않은 재료는 비교용 예상 범위로 보완해요.</p>
  {status&&<p role="status">{status}</p>}
  <label>비교할 레시피<select value={recipe?.id??''} onChange={e=>{setSelected(e.target.value);setOwned([]);}}><option value="">레시피 선택</option>{recipes.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
  {!recipes.length&&<p>현재 피할 재료 조건을 통과한 기본 레시피가 없어요.</p>}
  {!recipe&&recipes.length>0&&<p>이 상품과 같은 레시피는 아직 없어요. 비교해 보고 싶은 기본 요리를 선택해 주세요.</p>}
  {recipe&&estimate&&<>
   <h4>{recipe.name}</h4><small>약 {recipe.minutes} · 1인분 기준 조리 시간 · 상품과 분량·맛·영양은 다를 수 있어요.</small>
   <label>몇 끼를 만들까요?<select value={servings} onChange={e=>setServings(Number(e.target.value))}>{[1,2,3,4,5,6,7].map(n=><option key={n} value={n}>{n}끼 분량</option>)}</select></label>
   <span>재료 {estimate.rows.length}종 중 실제 상품 {estimate.linked}종 연결 · 나머지는 예상가</span>
   <dl><div><dt>간편식 한 끼</dt><dd>{won(product.price/product.servings)}</dd></div><div><dt>직접 요리 한 끼 재료비</dt><dd>약 {range(estimate.usedLow/servings,estimate.usedHigh/servings)}</dd></div><div><dt>{servings}끼 재료 사용분</dt><dd>약 {range(estimate.usedLow,estimate.usedHigh)}</dd></div><div><dt>지금 추가로 장보면</dt><dd>약 {range(estimate.buyLow,estimate.buyHigh)}</dd></div></dl>
   <small>한 끼에 쓰는 양과 구매 묶음은 달라요. 배송비·가스·전기 비용은 별도이며, 남는 재료는 다음 요리에 쓸 수 있어요.</small>
   <section className="recipe-products"><h5>필요한 재료와 예상 비용</h5><ul>{estimate.rows.map(r=><li key={r.id}>
    <strong>{r.name} {r.amount}{r.unit}</strong><span>사용분 약 {range(r.usedLow,r.usedHigh)}</span>
    {r.product?<><a href={r.product.productUrl!} target="_blank" rel="noopener noreferrer">{r.product.name} ↗</a><small>등록 상품 · {r.pack}{r.unit} / {won(r.low)}{r.product.priceCheckedAt?` · 가격 확인 ${r.product.priceCheckedAt.slice(0,10)}`:''}</small>{r.product.priceNote&&<small>{r.product.priceNote}</small>}</>:<small>예상가 · 구매 가정: {r.pack}{r.unit}에 {range(r.low,r.high)}</small>}
    <span>추가 구매 {r.packs}묶음 · {range(r.buyLow,r.buyHigh)}</span>
    {r.have>0&&<small>주문·보유 반영 {Math.round(r.have*10)/10}{r.unit}</small>}
    {r.left>0&&<small>만든 뒤 남는 재료 약 {Math.round(r.left*10)/10}{r.unit}</small>}
    <label><input type="checkbox" checked={owned.includes(r.id)} onChange={e=>setOwned(previous=>e.target.checked?[...previous,r.id]:previous.filter(id=>id!==r.id))}/>집에 있어요 · 추가 구매에서 제외</label>
   </li>)}</ul><small>연결된 상품의 주문·보유 수량을 먼저 반영해요. ‘집에 있어요’는 선택한 끼니 수에 필요한 양이 있다는 뜻이며, 비교 금액에만 반영돼요.</small></section>
   {recipes.filter(other=>other.id!==recipe.id&&other.parts.some(([id])=>estimate.rows.some(row=>row.id===id&&row.left>0&&!['salt','sugar','oil','sesameOil'].includes(id)))).length>0&&<p>남는 재료를 활용할 메뉴: {recipes.filter(other=>other.id!==recipe.id&&other.parts.some(([id])=>estimate.rows.some(row=>row.id===id&&row.left>0&&!['salt','sugar','oil','sesameOil'].includes(id)))).map(r=>r.name).join(', ')}. 다른 재료는 추가로 필요할 수 있어요.</p>}
   <section className="recipe-instructions"><h5>이렇게 만들어요 · 1인분 기준</h5>{servings>1&&<small>위 재료 목록은 {servings}끼 총량이에요. 아래 조리법은 한 끼 분량이며, 나누어 조리할 수 있어요.</small>}<ol>{recipe.steps.map(step=><li key={step}>{step}</li>)}</ol></section>
   <small>예상 비교용 레시피예요. 실제 구매 목록·식비·섭취 기록에는 자동 반영하지 않아요.</small>
  </>}
 </article>;
}
