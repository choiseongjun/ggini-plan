import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseTaste,tasteMask,tasteResult,tasteFoods} from '../lib/taste-atlas';
test('shared choices accept only the six-bit format',()=>{
 for(let i=0;i<64;i++)assert.equal(parseTaste(String(i)),i);
 for(const value of ['64','-1','1.5','01','',undefined,['3'],'<script>'])assert.equal(parseTaste(value),null);
});
test('every selection produces only liked recommendations; all-pass has none',()=>{
 for(let mask=0;mask<64;mask++){
  const answers=tasteFoods.map((_,i)=>!!(mask&(1<<i)));
  assert.equal(tasteMask(answers),mask);
  assert.deepEqual(tasteResult(mask).liked,tasteFoods.filter((_,i)=>answers[i]));
  assert.ok(tasteResult(mask).title);
 }
 assert.equal(tasteResult(0).liked.length,0);
 assert.equal(tasteResult(63).liked.length,6);
 assert.equal(tasteResult(3).title,'바삭하게 시작해, 국물로 마무리');
});
