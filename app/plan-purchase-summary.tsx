import {purchaseSummary} from '../lib/plan-explanation';
import type {purchaseBasket} from '../lib/shopping-plan';
export function PlanPurchaseSummary({rows,budget,money}:{rows:ReturnType<typeof purchaseBasket>;budget:number;money:(n:number)=>string}){
 const summary=purchaseSummary(rows);
 return <section className="plan-purchase-summary" aria-label="실제 구매 구성"><h3>실제로 살 상품은 얼마인가요?</h3><strong>추가 구매 상품 합계 {money(summary.total)}</strong><p>{summary.packs?`${summary.packs}묶음 · 판매처 ${summary.groups.filter(g=>g.seller!=='판매처 미확인').length}곳${summary.unknown?' · 판매처 미확인 상품 있음':''}`:'등록한 주문·보유 수량으로 준비할 수 있어요.'}</p><p>{summary.total<=budget?`입력 예산에서 ${money(budget-summary.total)} 남아요.`:`입력 예산보다 ${money(summary.total-budget)} 많아요.`} 배송비는 아직 반영하지 않았어요.</p>{summary.groups.length>0&&<ul>{summary.groups.map(g=><li key={g.seller}><span>{g.seller} · {g.items}종 / {g.packs}묶음</span><b>{money(g.cost)}</b><small>배송비 미확인 · 판매처에서 확인</small></li>)}</ul>}<small>남은 식단에 필요한 판매 묶음 기준으로 계산했어요. 최종 결제금액은 할인·옵션·배송비에 따라 달라져요. 판매처별로 따로 주문해야 해요.</small></section>;
}
