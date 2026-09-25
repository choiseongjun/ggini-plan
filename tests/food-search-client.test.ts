import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchFoods} from '../lib/food-search-client';
test('repeated and concurrent food queries reuse a request; failures can retry',async t=>{
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response(JSON.stringify({items:[]}),{status:calls===2?503:200});});
 await Promise.all([searchFoods('cache-test'),searchFoods('cache-test')]);
 await searchFoods('cache-test');
 assert.equal(calls,1);
 await assert.rejects(searchFoods('retry-test'));
 await searchFoods('retry-test');
 assert.equal(calls,3);
});
