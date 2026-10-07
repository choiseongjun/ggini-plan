import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rouletteCandidates,rouletteRotation} from '../lib/taste-roulette';
test('rerolls exclude exactly the last winner',()=>{
 for(let count=2;count<=6;count++){
  assert.equal(rouletteCandidates(count,null).length,count);
  for(let previous=0;previous<count;previous++){
   const eligible=rouletteCandidates(count,previous);
   assert.equal(eligible.length,count-1);assert.ok(!eligible.includes(previous));
  }
 }
 assert.deepEqual(rouletteCandidates(1,0),[0]);
});
test('pointer lands inside the selected wedge across repeated rotations',()=>{
 for(let count=2;count<=6;count++)for(const jitter of [-.5,0,.499]){
  let from=0;
  for(let spin=0;spin<60;spin++){
   const index=spin%count,to=rouletteRotation(from,index,count,jitter);
   assert.ok(to-from>=2160);
   const pointer=(360-to%360)%360;
   assert.equal(Math.floor(pointer/(360/count)),index);
   from=to%360;
  }
 }
});
