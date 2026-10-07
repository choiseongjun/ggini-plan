import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePantrySelection,recommendationIngredients,saveRecommendationPantry} from '../lib/recommendation-pantry';
import type {PlanProduct} from '../lib/shopping-plan';
import {restorePantry} from '../lib/pantry-inventory';

test('ingredient check deduplicates aliases and excludes water without assuming seasonings are owned',()=>{
 const product={recipe:{ingredients:['계란','달걀','대파','물','고추장'].map(name=>({product:{name}}))}} as PlanProduct;
 assert.deepEqual(recommendationIngredients(product),['달걀','파','고추장']);
});
test('login intent rejects corrupt, future and expired data and preserves valid selections',()=>{
 const now=2_000_000;
 assert.deepEqual(parsePantrySelection(JSON.stringify({names:['계란','달걀'],savedAt:now}),now)?.names,['달걀']);
 for(const value of ['bad',JSON.stringify({names:[3],savedAt:now}),JSON.stringify({names:['물'],savedAt:now}),JSON.stringify({names:['양파'],savedAt:now+1}),JSON.stringify({names:['양파'],savedAt:0})])assert.equal(parsePantrySelection(value,now),null);
});
test('saving merges into latest inventory and keeps existing lot metadata',async()=>{
 const existing=restorePantry([{name:'계란',quantity:'2개',useSoon:true},{name:'두부',planned:true}]);
 let written:any;
 const request=(async(_url,init)=>{
  if(init?.method==='PUT'){written=JSON.parse(String(init.body));return Response.json({userId:'u'});}
  return Response.json({userId:'u',inventory:existing,version:7});
 }) as typeof fetch;
 await saveRecommendationPantry('u',['달걀','양파'],request);
 assert.equal(written.version,7);assert.equal(written.inventory.length,3);
 assert.equal(written.inventory[0].quantity,'2개');assert.equal(written.inventory[0].useSoon,true);assert.equal(written.inventory[1].planned,true);
});
test('a concurrent edit refetches and merges without losing the other edit',async()=>{
 let reads=0,writes=0;
 const request=(async(_url,init)=>{
  if(init?.method==='PUT'){
   writes++;if(writes===1)return Response.json({conflict:true},{status:409});
   const body=JSON.parse(String(init.body));assert.equal(body.version,2);assert.ok(body.inventory.some((i:any)=>i.name==='두부'));
   return Response.json({userId:'u'});
  }
  reads++;return Response.json({userId:'u',version:reads,inventory:reads===1?[]:restorePantry([{name:'두부'}])});
 }) as typeof fetch;
 await saveRecommendationPantry('u',['양파'],request);assert.equal(reads,2);
});
test('a changed account or full pantry does not silently write or drop selections',async()=>{
 let writes=0;
 const mismatch=(async()=>Response.json({userId:'other',inventory:[],version:0})) as typeof fetch;
 await assert.rejects(saveRecommendationPantry('u',['양파'],mismatch));
 const full=(async(_url,init)=>{
  if(init?.method==='PUT')writes++;
  return Response.json({userId:'u',version:1,inventory:restorePantry(Array.from({length:100},(_,i)=>({name:`재료${i}`})))});
 }) as typeof fetch;
 await assert.rejects(saveRecommendationPantry('u',['양파'],full),/가득/);assert.equal(writes,0);
});
test('failed writes remain failures for retry and never report saved',async()=>{
 const request=(async(_url,init)=>init?.method==='PUT'?Response.json({error:'offline'},{status:503}):Response.json({userId:'u',inventory:[],version:0})) as typeof fetch;
 await assert.rejects(saveRecommendationPantry('u',['양파'],request),/offline/);
});
