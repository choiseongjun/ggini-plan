import {mealSchedule,purchaseBasket,slotLabels,type PlanProduct,type PlanConditions} from '../lib/shopping-plan';
import './cooking-shopping-guide.css';
import {RecipeVideos} from './recipe-videos';

export function CookingShoppingGuide({ids,products,conditions,onOwn,disabled}:{ids:string[];products:PlanProduct[];conditions:PlanConditions;onOwn:(id:string)=>void;disabled:boolean}){
 const meals=ids.map(id=>products.find(p=>p.id===id)!);
 if(!meals.some(p=>p.recipe&&!p.recipe.assembly))return null;
 const rows=purchaseBasket(ids,products,conditions.owned,conditions.supply,undefined,conditions.people),schedule=mealSchedule(conditions);
 const money=(n:number)=>`${n.toLocaleString('ko-KR')}원`;
 const amount=(p:PlanProduct,n:number)=>`${Number((n*(p.servingGrams??(p.unit==='개'?p.quantity:1))).toFixed(1))}${p.servingGrams?'g':p.unit==='개'?'개':'묶음'}`;
 return <details className="cooking-shopping-guide">
  <summary><div className="cooking-guide-head"><span>🧺 한 번 장보고, 여러 끼</span><h3>이 재료로 이렇게 먹어요</h3><p>재료 쓰는 양 기준 예상 {money(rows.reduce((s,r)=>s+r.cost,0))} · 배송비 별도 · 재료 {rows.length}가지 · {meals.length}끼 조리법</p></div><span className="cooking-guide-toggle" aria-hidden="true"><i/></span></summary>
  <h4>1. 장볼 재료 확인</h4><p>집에 충분히 있는 재료는 체크하면 구매 금액에서 빠져요. 일부만 있다면 아래 구매 목록에서 보유 수량을 입력해 주세요.</p>
  <ul>{rows.map(r=>{const uses=meals.filter(p=>p.recipe?.ingredients.some(i=>i.product.id===r.product.id));return <li key={r.product.id}><div><strong>{r.product.name}</strong><small>{r.product.detail} · {r.packs?`${r.packs}묶음 구매 · ${money(r.cost)}`:'추가 구매 없음'}</small><small>{uses.length?`${uses.map(p=>p.name).join(' → ')}에 사용`:'함께 먹을 상품'}{r.left>0?` · 준비 후 ${amount(r.product,r.left)} 남음`:''}</small>{r.product.productUrl&&<a href={r.product.productUrl} target="_blank" rel="noopener noreferrer">판매처 보기 ↗</a>}</div><label><input type="checkbox" checked={conditions.owned.includes(r.product.id)} disabled={disabled} onChange={()=>onOwn(r.product.id)}/>충분히 있어요</label></li>;})}</ul>
  <h4>2. 이 순서로 만들어 먹기</h4>
  <p>{conditions.people??1}명 전체 조리 분량이에요. 영양정보와 ‘먹었어요’는 내 1인분 기준으로 기록해요.</p>
  <div className="cooking-menu-grid">{meals.map((p,i)=>{
   const ungrouped=p.recipe?.ingredients.filter(part=>!part.group)??[];
   return <article key={i}><div className="cooking-day-badge">{schedule[i].day}일차 · {slotLabels[schedule[i].slot]} <span>{conditions.people??1}인분</span></div><h4>{p.name}</h4>{p.recipe?<>
    <h5>🧺 준비할 재료 · 전체 분량</h5><ul className="cooking-ingredient-chips">{ungrouped.map((part,j)=><li key={`${part.product.id}-${j}`}><span>{part.product.name}</span><strong>{amount(part.product,part.packs*(conditions.people??1))}</strong></li>)}</ul>
    <h5>🍳 만드는 순서</h5><ol>{p.recipe.steps.map((step,j)=><li key={j}><span aria-hidden="true">{j+1}</span><p>{step}</p></li>)}</ol>
    {!p.recipe.assembly&&<details className="cooking-video-details"><summary>조리 영상 참고하기</summary><RecipeVideos key={p.id} dishId={p.id}/></details>}
   </>:<p>상품 포장에 표시된 조리법을 따라 준비해 주세요.</p>}</article>;
  })}</div>
  <details><summary>남은 재료·보관 메모</summary><p>위 남는 양은 이 식단 전체를 준비한 뒤의 계산값이에요. 개봉한 두부·채소 등은 포장에 적힌 개봉 후 보관·소비 안내를 확인하고, 소비기한이 가까운 재료를 쓰는 메뉴부터 준비하세요. 표시된 일정은 보관 가능 기간을 보장하지 않아요.</p><p>추가 양념은 선택 사항이며 구매 금액·영양 계산에 포함되지 않아요.</p></details>
 </details>;
}
