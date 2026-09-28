import {test} from 'node:test';
import assert from 'node:assert/strict';
import {restaurantKeywords,mergeRestaurantMatches} from '../lib/restaurant-discovery';
import type {NearbyRestaurant} from '../lib/nearby-restaurants';
const place=(id:string,distance:number|null):NearbyRestaurant=>({id,name:'식당 '+id,category:'한식',address:'서울',phone:'',distance,url:'https://place.map.kakao.com/'+id,position:null});
test('searches the main dish without sides and expands with at most two relevant alternatives',()=>{
 assert.deepEqual(restaurantKeywords('소고기장국 + 오이무침'),['소고기장국','국밥','곰탕']);
 assert.deepEqual(restaurantKeywords('순두부찌개'),['순두부찌개','순두부','두부요리']);
 assert.deepEqual(restaurantKeywords('토마토_파스타 (1인분)'),['토마토 파스타','파스타','이탈리안']);
 assert.equal(restaurantKeywords('김치찌개').filter(x=>x==='김치찌개').length,1);
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
