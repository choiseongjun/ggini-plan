import {test} from 'node:test';
import assert from 'node:assert/strict';
import {restaurantKeywords,mergeRestaurantMatches,preferredRestaurantFilter} from '../lib/restaurant-discovery';
import type {NearbyRestaurant} from '../lib/nearby-restaurants';
const place=(id:string,distance:number|null):NearbyRestaurant=>({id,name:'식당 '+id,category:'한식',address:'서울',phone:'',distance,url:'https://place.map.kakao.com/'+id,position:null});
test('preserves dish aliases and removes preparation details from restaurant queries',()=>{
 assert.deepEqual(restaurantKeywords('닭볶음(닭갈비) 매운양념 치즈 + 공깃밥'),['닭갈비','닭볶음','닭요리']);
 assert.deepEqual(restaurantKeywords('닭볶음탕 매운양념 + 공깃밥'),['닭볶음탕','닭도리탕','닭요리']);
 assert.equal(restaurantKeywords('덮밥_돼지고기(제육)')[0],'제육볶음');
 assert.equal(restaurantKeywords('치즈 돈가스 + 공깃밥')[0],'돈까스');
 assert.equal(restaurantKeywords('회덮밥')[0],'회덮밥');
});
test('opens similar results when the main dish has no matches, without promoting unrelated places',()=>{
 const similar={...place('2',100),match:'similar' as const,keyword:'닭볶음'};
 const nearby={...place('3',10),match:'nearby' as const,keyword:''};
 assert.equal(preferredRestaurantFilter([nearby,similar]),'similar');
 assert.equal(preferredRestaurantFilter([similar,{...place('1',200),match:'menu',keyword:'닭갈비'}]),'menu');
 assert.equal(preferredRestaurantFilter([nearby]),'menu');
 assert.equal(preferredRestaurantFilter([]),'menu');
});
test('searches the main dish without sides and expands with at most two relevant alternatives',()=>{
 assert.deepEqual(restaurantKeywords('소고기장국 + 오이무침'),['소고기장국','국밥','곰탕']);
 assert.deepEqual(restaurantKeywords('순두부찌개'),['순두부찌개','순두부','두부요리']);
 assert.deepEqual(restaurantKeywords('토마토_파스타 (1인분)'),['토마토파스타','파스타','이탈리안']);
 assert.equal(restaurantKeywords('김치찌개').filter(x=>x==='김치찌개').length,1);
});
test('uses the same normalization across cuisine and dish categories',()=>{
 const cases:Array<[string,string,string]>=[
  ['국수_잔치국수','면 및 만두류','잔치국수'],
  ['냉면_물냉면','면 및 만두류','물냉면'],
  ['덮밥_송이버섯','밥류','송이버섯덮밥'],
  ['볶음밥_새우','밥류','새우볶음밥'],
  ['김치찌개_참치 + 공깃밥','찌개 및 전골류','김치찌개'],
  ['소고기 미역국 (500g)','국 및 탕류','소고기미역국'],
  ['갈비구이_소고기','구이류','갈비구이'],
  ['코다리조림 매운양념','조림류','코다리조림'],
  ['해물찜 (2인분)','찜류','해물찜'],
  ['닭튀김_양념','튀김류','닭튀김'],
  ['녹두빈대떡_해물','전·적 및 부침류','녹두빈대떡'],
  ['흑임자 죽','죽 및 스프류','흑임자죽'],
  ['감자샐러드 샌드위치','빵 및 과자류','감자샐러드샌드위치'],
  ['간자장_해물','면 및 만두류','간짜장'],
  ['스파게티_해물_크림소스','면 및 만두류','스파게티'],
  ['쌀국수 (1인분)','면 및 만두류','쌀국수'],
  ['매운 치즈 닭갈비 + 공깃밥','볶음류','닭갈비'],
 ];
 for(const [menu,category,primary] of cases){
  const words=restaurantKeywords(menu,category);
  assert.equal(words[0],primary,menu);
  assert.ok(words.length>=2&&words.length<=3,menu);
  assert.equal(words.length,new Set(words).size);
  assert.ok(words.every(word=>!/[+_()]/.test(word)),menu);
 }
 assert.ok(restaurantKeywords('쌀국수').includes('베트남음식'));
 assert.deepEqual(restaurantKeywords('감자샐러드 샌드위치'),['감자샐러드샌드위치','샌드위치','브런치']);
 assert.deepEqual(restaurantKeywords('처음보는요리 (1인분)','찜류'),['처음보는요리','찜요리','한식']);
 assert.deepEqual(restaurantKeywords('처음보는요리'),['처음보는요리']);
});
test('deduplicates restaurants, retains keyword provenance and sorts real distances',()=>{
 const result=mergeRestaurantMatches([{keyword:'순두부찌개',places:[place('1',400)]},{keyword:'두부요리',places:[place('2',100),place('1',400),place('3',null)]}],true);
 assert.deepEqual(result.map(p=>p.id),['2','1','3']);
 assert.equal(result[1].match,'menu');assert.equal(result[0].match,'similar');
 assert.equal(result[0].keyword,'두부요리');
});
test('a failed or empty main search never labels related places as menu matches',()=>{
 const result=mergeRestaurantMatches([{keyword:'장국',places:[]},{keyword:'국밥',places:[place('2',null)]}],false);
 assert.equal(result[0].match,'similar');
});
test('area searches prefer explicit restaurant names over indirect keyword hits',()=>{
 const result=mergeRestaurantMatches([{keyword:'순두부찌개',places:[place('1',null)]},{keyword:'순두부',places:[{...place('2',null),name:'맷돌순두부'}]}],false);
 assert.equal(result[0].id,'2');
 assert.deepEqual(restaurantKeywords('처음보는음식'),['처음보는음식']);
});
import {surroundingRestaurantsUrl,withSurroundingRestaurants} from '../lib/restaurant-discovery';
test('nearby restaurant discovery never uses the recommended menu as a restriction',()=>{
 const url=new URL(surroundingRestaurantsUrl({menu:'북어찜',latitude:37.498,longitude:127.028,radius:3000},2));
 assert.equal(url.pathname,'/v2/local/search/category.json');
 assert.equal(url.searchParams.has('query'),false);
 assert.equal(url.searchParams.get('category_group_code'),'FD6');
 assert.equal(url.searchParams.get('page'),'2');
 assert.equal(url.searchParams.get('radius'),'3000');
 const area=new URL(surroundingRestaurantsUrl({menu:'북어찜',area:'강남역',radius:3000}));
 assert.equal(area.searchParams.get('query'),'강남역 음식점');
});
test('zero menu matches still returns nearby restaurants and deduplicates overlapping pages',()=>{
 const result=withSurroundingRestaurants([place('1',200),place('2',50),place('1',200)],[],true);
 assert.deepEqual(result.map(p=>[p.id,p.match]),[['2','nearby'],['1','nearby']]);
 const overlap=withSurroundingRestaurants([place('1',200)],[{...place('1',200),match:'menu',keyword:'북어찜'}],true);
 assert.equal(overlap.length,1);assert.equal(overlap[0].match,'menu');
});
