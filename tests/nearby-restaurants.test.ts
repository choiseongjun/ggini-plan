import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseRestaurantSearch,restaurantSearchParams,parseRestaurants} from '../lib/nearby-restaurants';
test('validates either a neighborhood or complete numeric coordinates',()=>{
 assert.deepEqual(parseRestaurantSearch({menu:' 비빔밥 ',area:' 강남역 '}),{menu:'비빔밥',area:'강남역',radius:3000});
 for(const v of [null,{}, {menu:'a',area:' '},{menu:'a',latitude:37},{menu:'a',latitude:'37',longitude:127},{menu:'a',latitude:91,longitude:127},{menu:'a',latitude:NaN,longitude:127},{menu:'a',area:'서울',latitude:37,longitude:127},{menu:'a',area:'서울',radius:99999}])assert.equal(parseRestaurantSearch(v),null);
});
test('location searches use radius and distance while area searches use relevant keyword results',()=>{
 const nearby=restaurantSearchParams({menu:'비빔밥',latitude:37.5,longitude:127,radius:1000});
 assert.equal(nearby.get('x'),'127');assert.equal(nearby.get('y'),'37.5');assert.equal(nearby.get('sort'),'distance');assert.equal(nearby.get('category_group_code'),'FD6');assert.equal(nearby.get('radius'),'1000');
 const area=restaurantSearchParams({menu:'비빔밥',area:'강남역',radius:3000});assert.equal(area.get('query'),'강남역 비빔밥');assert.equal(area.has('x'),false);assert.equal(area.has('radius'),false);
});
test('accepts food places only and builds trusted links instead of forwarding provider URLs',()=>{
 const place={id:'123',place_name:'식당',category_group_code:'FD6',category_name:'음식점 > 한식',road_address_name:'서울 강남대로',phone:'02-123-4567',distance:'150',place_url:'javascript:bad'};
 const data={documents:[place,place,{...place,id:'bad'}, {...place,id:'456',category_group_code:'CE7'}]};
 assert.deepEqual(parseRestaurants(data,true),[{id:'123',name:'식당',category:'한식',address:'서울 강남대로',phone:'02-123-4567',distance:150,url:'https://place.map.kakao.com/123',position:null}]);
 assert.equal(parseRestaurants(data,false)[0].distance,null);assert.equal(parseRestaurants({documents:[{...place,distance:''}]},true)[0].distance,null);
 assert.deepEqual(parseRestaurants({documents:[{...place,x:'127.03',y:'37.50'}]},true)[0].position,{latitude:37.5,longitude:127.03});
 assert.equal(parseRestaurants({documents:[{...place,x:'',y:''}]},true)[0].position,null);
 assert.equal(parseRestaurants({documents:[{...place,x:'127',y:'999'}]},true)[0].position,null);
});
