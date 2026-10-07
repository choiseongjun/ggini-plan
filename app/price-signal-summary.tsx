import type {PlanProduct} from '../lib/shopping-plan';
import {priceReasonText} from '../lib/regional-price-recommendations';
import './pantry-daily-results.css';

export function PriceSignalSummary({products}:{products:PlanProduct[]}){
 const signals=[...new Map(products.flatMap(p=>(p.priceRecommendation?.reasons??[]).slice(0,1).map(r=>[JSON.stringify([r.ingredient,r.region,r.date,r.variety,r.unit]),r] as const))).values()];
 if(!signals.length)return null;
 return <details className="price-signal-summary"><summary><span>이번 추천에 참고한 시세</span><strong>{signals.length===1?`${signals[0].ingredient} ${signals[0].drop}% 하락`:`가격이 내린 재료 ${signals.length}가지`}</strong></summary><div>{signals.map(r=><p key={JSON.stringify(r)}>{priceReasonText(r)}</p>)}<small>조사 시세이며 실제 매장 판매가와 다를 수 있어요.</small></div></details>;
}
