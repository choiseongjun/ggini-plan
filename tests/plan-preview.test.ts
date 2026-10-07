import test from 'node:test';
import assert from 'node:assert/strict';
import {encodePlanPreview,readPlanPreview} from '../lib/plan-preview';
import {initialConditions,type PlanProduct} from '../lib/shopping-plan';

const draft=JSON.stringify({conditions:{...initialConditions,days:1,meals:1},mealIds:['meal'],savedAt:100});
const products=[{id:'meal',name:'계란밥',price:1234,servings:1},{id:'other',name:'다른 메뉴',price:100,servings:1}] as PlanProduct[];
test('preview restores matching meals without persisting unrelated catalog entries',()=>{
 const raw=encodePlanPreview(draft,products,100)!;
 const restored=readPlanPreview(raw,draft,101)!;
 assert.deepEqual(restored.mealIds,['meal']);
 assert.deepEqual(restored.products,[products[0]]);
});
test('changed, reset, expired or corrupt drafts never restore old preview',()=>{
 const raw=encodePlanPreview(draft,products,100)!;
 for(const changed of [null,'bad',draft.replace('meal"','other"'),JSON.stringify({...JSON.parse(draft),conditions:{...JSON.parse(draft).conditions,people:4}})])assert.equal(readPlanPreview(raw,changed,101),null);
 assert.equal(readPlanPreview(raw,draft,100+86400001),null);
 assert.equal(readPlanPreview(raw,draft,99),null);
 assert.equal(readPlanPreview('broken',draft,101),null);
 assert.equal(encodePlanPreview(draft,[],100),null);
 assert.equal(encodePlanPreview(draft.replace('["meal"]','[""]'),products,100),null);
});
