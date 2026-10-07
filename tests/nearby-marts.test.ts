import test from 'node:test';
import assert from 'node:assert/strict';
import {martKeywords,parseMartSearch,parseMarts,pickOffers,storeKey} from '../lib/nearby-marts';
import {priceRegionFromHeaders} from '../lib/ip-price-region';

test('IP headers map to a province or metro price region only inside Korea',()=>{
 const h=(values:Record<string,string>)=>new Headers(values);
 assert.equal(priceRegionFromHeaders(h({'x-vercel-ip-country':'KR','x-vercel-ip-country-region':'26'})),'부산');
 assert.equal(priceRegionFromHeaders(h({'x-vercel-ip-country':'KR','x-vercel-ip-country-region':'41','x-vercel-ip-city':'Suwon-si'})),'경기');
 assert.equal(priceRegionFromHeaders(h({'x-vercel-ip-country':'KR','x-vercel-ip-city':'Daegu'})),'대구');
 assert.equal(priceRegionFromHeaders(h({'x-vercel-ip-country':'TW','x-vercel-ip-country-region':'11'})),null);
 assert.equal(priceRegionFromHeaders(h({})),null);
});

test('mart searches need a typed area and only use two-letter ingredient names',()=>{
 assert.equal(parseMartSearch({area:'망',items:[]}),null);
 assert.equal(parseMartSearch({area:'망원동',items:'두부'}),null);
 assert.deepEqual(parseMartSearch({area:' 망원동 ',items:['두부','달걀(생것)','파','양파','두부']}),{area:'망원동',keywords:['두부','계란','양파']});
 assert.deepEqual(martKeywords(['다진마늘','밥']),['마늘']);
});

test('only mart places are kept and store names compare without spaces or corporate marks',()=>{
 const marts=parseMarts({documents:[
  {id:'1',place_name:'이마트 마포점',category_group_code:'MT1',road_address_name:'서울 마포구 월드컵로',address_name:'서울 마포구 망원동 1'},
  {id:'2',place_name:'김밥천국',category_group_code:'FD6',address_name:'서울 마포구 망원동 2'},
  {id:'1',place_name:'이마트 마포점',category_group_code:'MT1'},
  {id:'3',place_name:'롯데마트 제주점',category_group_code:'MT1',address_name:'제주특별자치도 제주시 연동'},
 ]},'망원동');
 assert.deepEqual(marts.map(m=>[m.name,m.url]),[['이마트 마포점','https://place.map.kakao.com/1']]);
 assert.equal(storeKey('(주)GS 더프레시 구월점'),storeKey('GS더프레시구월점'));
});

test('neighbourhood supermarkets without the MT1 group are kept, closed or ice-cream shops are not',()=>{
 const marts=parseMarts({documents:[
  {id:'1',place_name:'현대마트',category_group_code:'',category_name:'가정,생활 > 슈퍼마켓',address_name:'서울 마포구 망원동 517'},
  {id:'2',place_name:'망원아이스크림',category_group_code:'',category_name:'가정,생활 > 슈퍼마켓',address_name:'서울 마포구 망원동 479'},
  {id:'3',place_name:'홈플러스 망원점 (폐점)',category_group_code:'MT1',address_name:'서울 마포구 망원동 1'},
  {id:'4',place_name:'열쇠마트',category_group_code:'',category_name:'가정,생활 > 생활용품점 > 열쇠,도장',address_name:'서울 마포구 망원동 479'},
 ]},'망원동');
 assert.deepEqual(marts.map(m=>m.name),['현대마트']);
});

test('offers skip longer product names and basic seasonings, one cheapest product per ingredient',()=>{
 assert.deepEqual(martKeywords(['소금','버터','두부']),['버터','두부']);
 const rows=[{product:'버터롤 클래식(21개입)',price:6480,date:'2026-09-25'},{product:'서울우유 버터(450g)',price:11580,date:'2026-09-25'},{product:'국산콩두부 찌개용(380g)',price:2750,date:'2026-09-25'},{product:'행복한콩 부침두부(300g)',price:1480,date:'2026-09-25'}];
 assert.deepEqual(pickOffers(rows,['버터','두부']).map(o=>[o.ingredient,o.product,o.price]),[['버터','서울우유 버터(450g)',11580],['두부','행복한콩 부침두부(300g)',1480]]);
});

test('spaced and attached ingredient names match, ingredients inside other products do not',()=>{
 const rows=[{product:'서울우유 버터(450g)',price:11580,date:'d'},{product:'청정원 카레여왕 구운마늘&양파(108g)',price:4280,date:'d'},{product:'CJ 1등급 깨끗한 계란(15개)',price:9480,date:'d'}];
 assert.deepEqual(pickOffers(rows,['버터','양파','계란']).map(o=>o.ingredient),['버터','계란']);
});
