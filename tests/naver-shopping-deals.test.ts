import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseNaverShoppingDeals,searchNaverShopping} from '../lib/naver-shopping-deals';
const item={title:'<b>두부</b> 300g &amp; 2팩',mallName:'식품몰',link:'https://shop.example.com/products/1',lprice:'2500',hprice:'9000',productType:'2',category1:'식품',category2:'농산물',category3:'두부'};
test('shopping prices are not invented discounts or free shipping',()=>{
 const [d]=parseNaverShoppingDeals({items:[item]});
 assert.equal(d.title,'두부 300g & 2팩');assert.equal(d.price,2500);assert.equal(d.source_name,'식품몰');
 assert.equal(d.original_price,null);assert.equal(d.discount_rate,null);assert.equal(d.shipping,null);
 assert.equal(d.collection_source,'naver-shopping');
});
test('exclude nonfood, used items, zero prices and unsafe URLs; deduplicate results',()=>{
 const bad=[{category1:'생활/건강'},{category2:'건강기능식품'},{productType:'4'},{productType:'10'},{lprice:'0'},{lprice:'2500oops'},{link:'javascript:alert(1)'},{link:'https://127.0.0.1/a'}];
 assert.equal(parseNaverShoppingDeals({items:[...bad.map(p=>({...item,...p})),item,item]}).length,1);
 assert.throws(()=>parseNaverShoppingDeals({error:'upstream error'}));
});
test('collector uses the documented shopping endpoint and fails visibly on authorization errors',async()=>{
 const previous=[process.env.NAVER_SHOPPING_CLIENT_ID,process.env.NAVER_SHOPPING_CLIENT_SECRET];
 process.env.NAVER_SHOPPING_CLIENT_ID='test';process.env.NAVER_SHOPPING_CLIENT_SECRET='test';
 try{
  await assert.rejects(searchNaverShopping('두부',(async(url,options)=>{
   assert.equal(new URL(String(url)).hostname,'openapi.naver.com');assert.equal(new URL(String(url)).pathname,'/v1/search/shop.json');
   assert.equal(options?.redirect,'error');return Response.json({}, {status:401});
  }) as typeof fetch),/인증 실패/);
 }finally{
  for(const [i,key] of ['NAVER_SHOPPING_CLIENT_ID','NAVER_SHOPPING_CLIENT_SECRET'].entries())if(previous[i]===undefined)delete process.env[key];else process.env[key]=previous[i];
 }
});
