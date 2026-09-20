import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseOasisProduct,oasisSpecs} from '../lib/oasis-collector';
const spec=oasisSpecs[1];
const html=`<meta property="og:title" content="${spec.name}"><meta property="og:image" content="https://oasisprodproduct.edge.naverncp.com/3560/thumb/300"><script>var discountPrice = "1700";</script><span class="totalCouponDiscountPrice_price">1,700원</span>`;
test('oasis uses matching displayed sale price and reviewed pack',()=>{assert.equal(parseOasisProduct(html,spec).price,1700);assert.equal(parseOasisProduct(html,spec).detail,'300g · 1팩');});
test('oasis fails closed for changed names, missing or conflicting prices',()=>{for(const changed of [html.replace(spec.name,'다른 상품'),html.replace('1,700원','1,600원'),html.replace('1700','0'),html.replace('oasisprodproduct.edge.naverncp.com','example.com')])assert.throws(()=>parseOasisProduct(changed,spec));});
