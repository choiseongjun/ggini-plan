import test from 'node:test';
import assert from 'node:assert/strict';
import {missingPantryIngredients,pantryCandidates,pantryCookingStyle,isPantrySeasoning} from '../lib/pantry-recommendation';
import type {PlanProduct} from '../lib/shopping-plan';
const recipe=(id:string,names:string[])=>({id,recipe:{ingredients:names.map(name=>({product:{name}}))}} as PlanProduct);
test('pantry matching normalizes aliases, ignores water but requires seasonings',()=>{
 const p=recipe('egg',['계란','대파','물','간장']);
 assert.deepEqual(missingPantryIngredients(p,['달걀','파']),['간장']);
 assert.deepEqual(missingPantryIngredients(p,['달걀','파','진간장']),[]);
 assert.deepEqual(missingPantryIngredients(recipe('pork',['돼지고기']),['소고기']),['돼지고기']);
});
test('no-shopping mode never silently assumes seasonings or removes missing ingredients',()=>{
 const complete=recipe('complete',['달걀','밥']),onion=recipe('onion',['달걀','양파']),salt=recipe('salt',['달걀','소금']);
 assert.deepEqual(pantryCandidates([complete,onion,salt],['달걀','밥'],['complete'],[],false).map(p=>p.id),['complete']);
 assert.deepEqual(pantryCandidates([onion,salt],['달걀'],[],[],false),[]);
});
test('cooking styles separate different methods and cleanup identifies all basic seasonings',()=>{
 assert.equal(pantryCookingStyle({...recipe('a',[]),name:'김치볶음밥'}),'볶음밥');
 assert.equal(pantryCookingStyle({...recipe('b',[]),name:'두부간장덮밥'}),'덮밥');
 assert.equal(isPantrySeasoning('마요네즈'),true);assert.equal(isPantrySeasoning('두부'),false);
});
test('less shopping precedes novelty; unseen dishes break equally feasible ties',()=>{
 const a=recipe('a',['달걀']),b=recipe('b',['두부']),c=recipe('c',['두부','파']);
 assert.deepEqual(pantryCandidates([a,b,c],['계란'],['a']).map(p=>p.id),['a']);
 assert.deepEqual(pantryCandidates([a,b,c],[],['a']).map(p=>p.id),['b']);
 assert.deepEqual(pantryCandidates([],[]),[]);
 const d=recipe('d',['달걀','파']);
 assert.deepEqual(pantryCandidates([a,d],['달걀'],['a']).map(p=>p.id),['a']);
 assert.deepEqual(pantryCandidates([a,d],['달걀','파'],['a']).map(p=>p.id),['d']);
});
test('earlier expiry wins among equally feasible recipes without adding missing ingredients',()=>{
 const egg=recipe('egg',['달걀']),tofu=recipe('tofu',['두부']),costly=recipe('costly',['달걀','돼지고기']);
 assert.deepEqual(pantryCandidates([egg,tofu,costly],['달걀','두부'],[],['두부','달걀']).map(p=>p.id),['tofu']);
 assert.deepEqual(pantryCandidates([egg,tofu,costly],['달걀'],[],['두부']).map(p=>p.id),['egg']);
});
test('missing basic seasonings do not outweigh main ingredient availability',()=>{
 const available=recipe('available',['달걀','소금','후추','간장']),shopping=recipe('shopping',['달걀','소고기']);
 assert.deepEqual(pantryCandidates([available,shopping],['달걀']).map(p=>p.id),['available']);
 assert.deepEqual(missingPantryIngredients(recipe('rice',['백미밥']),['밥']),[]);
});
test('only small unnamed rice-dish aromatics may be skipped; required vegetables remain required',()=>{
 const p={...recipe('rice',['밥','달걀','양파']),name:'계란볶음밥'};
 p.recipe!.ingredients[2].label='양파 30g';
 assert.deepEqual(missingPantryIngredients(p,['밥','달걀']),[]);
 assert.deepEqual(missingPantryIngredients({...p,name:'양파볶음밥'},['밥','달걀']),['양파']);
 assert.deepEqual(missingPantryIngredients({...p,name:'계란국'},['밥','달걀']),['양파']);
 p.recipe!.ingredients[2].label='양파 100g';
 assert.deepEqual(missingPantryIngredients(p,['밥','달걀']),['양파']);
});
