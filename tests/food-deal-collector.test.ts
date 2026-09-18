import {test} from 'node:test';
import assert from 'node:assert/strict';
import {discountRate,parseKurlyProduct,robotsAllows} from '../lib/food-deal-parser';
const url='https://www.kurly.com/goods/1001866269';
const product={no:1001866269,name:'[채선당] 샤브샤브 밀키트(2인분)',categoryNames:['CATEGORY','밀키트','한식 국/탕/찌개류'],isPurchaseStatus:true,isSoldOut:false,volume:'955G',salesUnit:'1팩',dealProducts:[{basePrice:20900,discountedPrice:18810,isPurchaseStatus:true,isSoldOut:false,minEa:1}],deliveryTypeInfos:[{deliveryFeeDescription:'3,000원 (4만원 이상 무료)'}]};
const html=(p:unknown)=>`<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({props:{pageProps:{product:p}}})}</script>`;
test('same offer prices and shipping',()=>{const r=parseKurlyProduct(html(product),url);assert.equal(r.kind,'deal');if(r.kind!=='deal')return;assert.equal(r.deal.discount_rate,10);assert.equal(r.deal.price,18810);assert.equal(r.deal.shipping,3000);assert.equal(r.deal.deal_category,'meal_kit');assert.equal(discountRate(100,101),null);assert.equal(discountRate(0,1),null);assert.equal(discountRate(3,2),33.33);});
test('sold out, no discount, ambiguous options, nonfood are not published',()=>{
 assert.equal(parseKurlyProduct(html({...product,isSoldOut:true}),url).kind,'ended');
 assert.equal(parseKurlyProduct(html({...product,dealProducts:[{...product.dealProducts[0],discountedPrice:20900}]}),url).kind,'ended');
 assert.equal(parseKurlyProduct(html({...product,isMultiplePrice:true}),url).kind,'skip');
 assert.equal(parseKurlyProduct(html({...product,categoryNames:['주방용품'],name:'샐러드 접시'}),url).kind,'skip');
 assert.throws(()=>parseKurlyProduct(html({...product,no:10}),url));assert.throws(()=>parseKurlyProduct('<html>error</html>',url));
});
test('robots does not inherit Google-only allowance',()=>{
 assert.equal(robotsAllows('User-agent: Googlebot\nAllow: /\nUser-agent: *\nDisallow: /','/goods/1'),false);
 assert.equal(robotsAllows('User-agent: *\nAllow: /\nDisallow: /mypage/','/goods/1'),true);
 assert.equal(robotsAllows('User-agent: *\nAllow: /\nDisallow: /mypage/','/mypage/profile'),false);
 assert.equal(robotsAllows('User-agent: *<br>Disallow: /<br>User-agent: Googlebot<br>Allow: /','/goods/1'),false);
});
