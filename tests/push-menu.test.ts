import assert from 'node:assert/strict';
import {test} from 'node:test';
import {pushMenuFor,pushMenuMessage,spokenMenuName} from '../lib/push-menu';
import {planProducts} from '../lib/shopping-plan-catalog';

test('push menu: a real dish per slot, stable per device and day, varied across devices',async()=>{
 const products=await planProducts();
 for(const slot of ['breakfast','lunch','dinner'] as const){
  const a=pushMenuFor(products,slot,'2026-10-06','device-a');
  assert.ok(a,`no ${slot} menu`);
  assert.deepEqual(pushMenuFor(products,slot,'2026-10-06','device-a'),a);
  assert.ok(a!.kcal>0&&a!.price>0);
 }
 const names=new Set(['a','b','c','d','e','f','g','h'].map(seed=>pushMenuFor(products,'dinner','2026-10-06',seed)?.id));
 assert.ok(names.size>=3,'devices should not all get the same dinner');
 const message=pushMenuMessage({id:'recipe-opt-x',name:'제육덮밥',price:1520,kcal:558},'dinner');
 assert.equal(message.title,'오늘 저녁 제육덮밥 어때요?');
 assert.match(message.body,/1,520원 · 558kcal/);
 assert.equal(message.url,'/?from=push&meal=recipe-opt-x&slot=dinner');
});

test('menu names read the way people say them',()=>{
 assert.equal(spokenMenuName('덮밥_해물'),'해물덮밥');
 assert.equal(spokenMenuName('샌드위치_단호박크림치즈 샌드위치'),'단호박크림치즈 샌드위치');
 assert.equal(spokenMenuName('덮밥_돼지고기(제육)'),'돼지고기(제육)덮밥');
 assert.equal(spokenMenuName('불고기덮밥'),'불고기덮밥');
});
