import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fridgePicks,shoppingLine} from '../lib/fridge-pick';

test('picks a dish that uses what you tapped and needs at most one more thing',()=>{
 const kimchiEgg=fridgePicks(['kimchi','egg','rice','scallion'])[0];
 assert.ok(kimchiEgg.uses.includes('김치')||kimchiEgg.uses.includes('달걀'),JSON.stringify(kimchiEgg));
 assert.ok(kimchiEgg.missing.length<=1,JSON.stringify(kimchiEgg));
 const tuna=fridgePicks(['tuna','kimchi','tofu','onion'])[0];
 assert.equal(tuna.name,'참치김치찌개');
 // 고른 재료를 쓰지 않는 메뉴가 1등이 되지 않는다.
 for(const chips of [['pork','kimchi'],['potato','ham','onion'],['egg'],['fishcake']] as const){
  const top=fridgePicks([...chips])[0];
  assert.ok(top.uses.length>0,`${chips} -> ${top.name}`);
 }
});
test('"다른 거" skips what was already shown',()=>{
 const first=fridgePicks(['egg','rice']);
 const next=fridgePicks(['egg','rice'],[first[0].id]);
 assert.notEqual(next[0].id,first[0].id);
});
test('shopping line wording',()=>{
 assert.equal(shoppingLine([]),'더 살 거 없음!');
 assert.equal(shoppingLine(['대파']),'대파 하나만 사면 돼요');
 assert.equal(shoppingLine(['대파','소시지']),'대파·소시지만 더 있으면 돼요');
});
