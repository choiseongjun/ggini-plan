import test from 'node:test';
import assert from 'node:assert/strict';
import {storeLocations} from '../lib/store-locations';
const place={id:'123',place_name:'이마트 가든5점',category_group_code:'MT1',category_name:'가정,생활 > 대형마트',road_address_name:'서울 송파구 충민로 10',x:'127.119',y:'37.478'};
test('unique full branch match gets exact label and provider coordinates',()=>{
 const result=storeLocations({documents:[place]},'이마트가든5점');
 assert.equal(result.exact,true);assert.equal(result.places[0].position?.latitude,37.478);
});
test('different branch and duplicate names stay candidates, never exact',()=>{
 assert.equal(storeLocations({documents:[place]},'이마트목동점').exact,false);
 assert.equal(storeLocations({documents:[place,{...place,id:'456'}]},'이마트가든5점').exact,false);
});
test('invalid coordinates and unrelated shops are excluded',()=>{
 for(const patch of [{x:''},{y:'NaN'},{y:'0'},{category_group_code:'FD6',category_name:'음식점'},{id:'bad'}])assert.equal(storeLocations({documents:[{...place,...patch}]},'이마트가든5점').places.length,0);
});
