import assert from 'node:assert/strict';
import {test} from 'node:test';
import {initialConditions,parseConditions,candidates,type PlanProduct} from '../lib/shopping-plan';
import {resolveShoppingExclusions} from '../lib/shopping-exclusions';

test('saved exclusions and legacy text become visible selections; explicit clearing stays cleared',()=>{
 const c=resolveShoppingExclusions({...initialConditions,avoid:'계란, 고수, 새우'},['chicken','shrimp']);
 assert.deepEqual(c.excluded,['chicken','shrimp','egg']);assert.equal(c.avoid,'고수');
 assert.deepEqual(resolveShoppingExclusions({...c,excluded:[],avoid:''},['chicken']).excluded,[]);
 assert.equal(parseConditions({...initialConditions,excluded:['unknown']}),null);
 assert.equal(parseConditions({...initialConditions,excluded:'shrimp'}),null);
});
test('unchecking restores candidates, checked exclusions reject unknown ingredients too',()=>{
 const products=[{id:'shrimp',name:'새우볶음밥',avoidanceText:'새우 쌀',allergens:['shrimp']},{id:'pumpkin',name:'호박죽',avoidanceText:'호박 쌀'},{id:'unknown',name:'도시락',avoidanceText:null}].map(p=>({...p,price:4500,productUrl:'https://example.com',category:'ready_meal',servings:1})) as PlanProduct[];
 assert.deepEqual(candidates(products,{...initialConditions,excluded:['shrimp']}).map(p=>p.id),['pumpkin']);
 assert.equal(candidates(products,{...initialConditions,excluded:[]}).length,3);
});
