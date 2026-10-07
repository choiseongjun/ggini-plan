import test from 'node:test';
import assert from 'node:assert/strict';
import {priceSignal,type RegionalPrice} from '../lib/regional-price-recommendations';
import {pantrySourceProducts,pantrySourceRecommendations} from '../lib/pantry-source-recommendations';
import type {PlanProduct} from '../lib/shopping-plan';
const row:RegionalPrice={region:'서울',name:'호박',variety:'애호박',grade:'상품',unit:'1개',price:880,previous:1000,date:'2026-10-07',previousDate:'2026-09-30'};
const recipe=(names:string[])=>({sourceRecipe:{ingredients:names.map(name=>({name}))}} as PlanProduct);
const context={region:'서울',rows:[row],today:'2026-10-07'};
test('explicit same-series comparison supplies dated evidence and capped bonus',()=>{
 const result=priceSignal(recipe(['애호박','애호박']),context);
 assert.equal(result.bonus,0.6);assert.equal(result.reasons.length,1);assert.equal(result.reasons[0].drop,12);
 assert.equal(result.reasons[0].unit,'1개');
});
test('missing, stale, future, malformed and other-region data give no bonus',()=>{
 for(const patch of [{region:'부산'},{price:NaN},{previous:null},{previous:0},{date:'2026-09-28'},{date:'2026-10-08'},{date:'bad'},{date:'2026-99-99'},{previousDate:'2026-09-29'},{price:1100},{variety:'단호박'}]){
  assert.equal(priceSignal(recipe(['애호박']),{...context,rows:[{...row,...patch}]}).bonus,0);
 }
 assert.equal(priceSignal(recipe(['단호박 퓨레']),context).bonus,0);
});
test('disabled or unavailable prices preserve order and price ranking never adds shopping',()=>{
 const args:[string[],string[],string[],boolean,[],boolean,string[],string[],number]=[[],[],[],true,[],false,[],[],30];
 const baseline=pantrySourceRecommendations(...args);
 assert.deepEqual(pantrySourceRecommendations(...args,{...context,rows:[]}).map(p=>p.id),baseline.map(p=>p.id));
 assert.deepEqual(pantrySourceRecommendations([],[],[],false,[],false,[],[],30,context),[]);
 const ranked=pantrySourceRecommendations(...args,context);
 assert.deepEqual(new Set(ranked.map(p=>p.id)),new Set(baseline.map(p=>p.id)));
});
test('real recipe catalogue receives signals without changing source ingredient names',()=>{
 const matches=pantrySourceProducts().filter(p=>priceSignal(p,context).bonus>0);
 assert.ok(matches.length>0);
 assert.ok(matches.every(p=>p.sourceRecipe!.ingredients.some(i=>i.name==='애호박')));
});
test('home catalogue ingredients match exact raw names, not prepared products',()=>{
 const home=(name:string)=>({recipe:{ingredients:[{product:{name}}]}} as PlanProduct);
 assert.equal(priceSignal(home('애호박'),context).bonus,0.6);
 assert.equal(priceSignal(home('애호박 볶음'),context).bonus,0);
});
