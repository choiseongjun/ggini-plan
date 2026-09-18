import {purchaseSummary} from '../lib/plan-explanation';
import type {purchaseBasket} from '../lib/shopping-plan';
const sellerNames:Record<string,string>={'kurly.com':'컬리','cjthemarket.com':'CJ더마켓'};
export function PlanPurchaseSummary({rows,budget,money}:{rows:ReturnType<typeof purchaseBasket>;budget:number;money:(n:number)=>string}){
 const summary=purchaseSummary(rows);
 const remaining=budget-summary.total;
 const sellers=summary.groups.filter(g=>g.seller!=='판매처 미확인').length;
 return <section className="plan-purchase-summary" aria-label="실제 구매 구성">
  <header className="purchase-heading"><span className="purchase-mascot" aria-hidden="true">🛍️</span><div><span className="purchase-eyebrow">차곡차곡, 이번 장보기</span><h3>실제로 살 상품은 얼마인가요?</h3></div></header>
  <div className="purchase-total"><span>추가 구매 상품 합계</span><strong>{money(summary.total)}</strong><div className="purchase-chips"><span>{summary.packs}묶음</span><span>판매처 {sellers}곳</span><span>배송비 별도</span></div></div>
  <div className={`purchase-budget${remaining<0?' is-over':''}`}><span aria-hidden="true">{remaining<0?'💭':'🌱'}</span><p>{remaining<0?<>입력 예산보다 <b>{money(-remaining)}</b> 많아요</>:<>입력 예산에서 <b>{money(remaining)}</b> 남아요</>}<small>배송비는 아직 포함되지 않았어요</small></p></div>
  {summary.packs===0&&<p className="purchase-ready">집에 있거나 주문한 재료로 준비할 수 있어요 🍚</p>}
  {summary.unknown>0&&<p className="purchase-ready">판매처가 확인되지 않은 상품이 있어요.</p>}
  {summary.groups.length>0&&<ul className="purchase-sellers">{summary.groups.map(g=><li key={g.seller}><span className={`purchase-store-icon${g.seller==='kurly.com'?' is-kurly':''}`} aria-hidden="true">{g.seller==='kurly.com'?'🧺':'🏪'}</span><div className="purchase-store-name"><b>{sellerNames[g.seller]??g.seller}</b><small>{g.items}종 · {g.packs}묶음</small></div><div className="purchase-store-cost"><strong>{money(g.cost)}</strong><small>배송비 확인 필요</small></div></li>)}</ul>}
  <details className="purchase-notes"><summary>구매 금액은 이렇게 계산해요</summary><p>남은 식단에 필요한 판매 묶음 기준이에요. 최종 금액은 할인·옵션·배송비에 따라 달라질 수 있어요. 판매처별로 따로 주문하고, 배송비는 각 판매처에서 확인해 주세요.</p></details>
 </section>;
}
