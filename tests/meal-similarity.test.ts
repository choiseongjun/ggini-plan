import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mealSimilarity} from '../lib/meal-similarity';
import {alternativesFor,initialConditions,type PlanProduct} from '../lib/shopping-plan';
import {remoteEngine} from '../app/plan-engine';

const dish=(id:string,name:string,extra:Partial<PlanProduct>={}):PlanProduct=>({
 id,name,price:2000,servings:1,quantity:1,unit:'개',category:'frozen_meal',
 productUrl:'https://example.com',avoidanceText:'두부',
 recipe:{minutes:15,slots:['dinner'],family:id,steps:['조리하기'],ingredients:[],nutrition:{calories:500,protein:20}},
 ...extra,
} as PlanProduct);
const c={...initialConditions,cookingEffort:'relaxed' as const,days:1,meals:1,budget:5000};

test('shared main ingredient ranks ahead of an unrelated high personalization score',()=>{
 const a=dish('a','두부구이'),b=dish('b','두부조림'),d=dish('d','닭고기볶음',{personalizationScore:400});
 assert.equal(alternativesFor([a,d,b],['a'],c,0,3)[0].id,'b');
 assert.ok(mealSimilarity(a,b).reasons.includes('두부를 활용한 다른 메뉴'));
});
test('unknown nutrition and shared side dishes do not create similarity claims',()=>{
 const a=dish('a','닭구이 + 두부조림',{recipe:undefined}),b=dish('b','두부구이',{recipe:undefined});
 assert.deepEqual(mealSimilarity(a,b).reasons,['같은 구이 종류']);
});
test('different side combinations do not fill the list with the same main dish',()=>{
 const a=dish('a','두부구이'),b=dish('b--sides-1','두부조림 + 오이무침'),d=dish('b--sides-2','두부조림 + 콩나물무침'),e=dish('e','달걀찜');
 assert.deepEqual(alternativesFor([a,b,d,e],['a'],c,0,3).map(p=>p.id),['b--sides-1','e']);
});
test('over-budget, excluded and wrong-slot alternatives are removed before limit',()=>{
 const a=dish('a','두부구이');
 const ingredient={...dish('ingredient','재료'),recipe:undefined,price:9000};
 const expensive=dish('expensive','두부조림',{recipe:{...a.recipe!,ingredients:[{product:ingredient,packs:1,label:'재료'}]}});
 const excluded=dish('excluded','새우구이',{avoidanceText:'새우'});
 const breakfast=dish('breakfast','두부찜',{recipe:{...a.recipe!,slots:['breakfast']}});
 const allowed=dish('allowed','달걀찜');
 assert.deepEqual(alternativesFor([a,expensive,excluded,breakfast,allowed],['a'],{...c,avoid:'새우'},0,3).map(p=>p.id),['allowed']);
});
test('existing meals are not returned as alternatives when fewer than three exist',async()=>{
 const originalFetch=globalThis.fetch;
 const a=dish('a','두부구이'),b=dish('b','두부조림');
 try{
  globalThis.fetch=async()=>new Response(JSON.stringify({alternativeIds:['b'],products:[b,a]}),{status:200});
  const learned:PlanProduct[]=[];
  const engine=remoteEngine(p=>learned.push(...p));
  assert.deepEqual((await engine.alternatives(['a'],0,c,3)).map(p=>p.id),['b']);
  assert.equal(learned.length,2);
  globalThis.fetch=async()=>new Response(JSON.stringify({alternativeIds:[],products:[a]}),{status:200});
  assert.deepEqual(await engine.alternatives(['a'],0,c,3),[]);
 }finally{globalThis.fetch=originalFetch;}
});
