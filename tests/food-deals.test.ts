import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseDeal,dealState,publicUrl} from '../lib/food-deals';
const deal={title:'즉석밥',food_type:'rice',source_name:'공식몰',source_url:'https://example.com/event',product_url:'https://example.com/product',price:19900,shipping:null,pack:'210g 12개',conditions:'쿠폰 적용 조건 확인',product_id:null,status:'draft',ends_at:null};
test('publishing requires explicit review; zero shipping is distinct from unknown',()=>{
 assert.ok(parseDeal(deal));assert.equal(parseDeal({...deal,status:'live'}),null);
 assert.ok(parseDeal({...deal,status:'live',reviewed:true}));
 assert.equal(parseDeal({...deal,shipping:0})?.shipping,0);assert.equal(parseDeal(deal)?.shipping,null);
 assert.equal(parseDeal({...deal,price:-1}),null);assert.equal(parseDeal({...deal,price:1.5}),null);
 assert.equal(parseDeal({...deal,status:'live',reviewed:true,ends_at:'2020-01-01T00:00:00Z'}),null);
});
test('drafts never become public; stale and expired offers lose active status',()=>{
 const now=Date.parse('2026-09-18T12:00:00Z'),base={status:'live' as const,checked_at:'2026-09-18T10:00:00Z',ends_at:null};
 assert.equal(dealState(base,now),'live');assert.equal(dealState({...base,status:'draft'},now),'draft');
 assert.equal(dealState({...base,checked_at:'2026-09-17T10:00:00Z'},now),'stale');
 assert.equal(dealState({...base,ends_at:'2026-09-18T11:00:00Z'},now),'ended');
 assert.equal(dealState({...base,checked_at:null},now),'stale');
});
test('only external HTTPS links without embedded credentials are accepted',()=>{
 for(const url of ['javascript:alert(1)','http://example.com','https://user:pass@example.com','https://127.0.0.1/x','https://localhost/x'])assert.equal(publicUrl(url),null);
 assert.equal(publicUrl('https://example.com/a?option=2#x'),'https://example.com/a?option=2');
});
