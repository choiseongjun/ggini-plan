import assert from 'node:assert/strict';
import {test} from 'node:test';
import {initialConditions,parseConditions,recommendShopping,shoppingBudgetLimit,swapMeal,type PlanProduct} from '../lib/shopping-plan';

const products=[{id:'a',name:'버섯죽',price:1100000},{id:'b',name:'단호박죽',price:1200000}].map(p=>({...p,servings:1,category:'ready_meal',productUrl:'https://example.com/item',avoidanceText:''} as PlanProduct));
const unlimited={...initialConditions,mealMode:'ready' as const,days:1,meals:1,budget:1000000,budgetUnlimited:true};

test('BUG-002: omitted budget has no artificial million-won limit after serialization',()=>{
 const c=parseConditions(JSON.parse(JSON.stringify(unlimited)))!;
 assert.ok(c);
 assert.equal(shoppingBudgetLimit(c),Infinity);
 assert.equal(recommendShopping(products,c)?.length,1);
 assert.deepEqual(swapMeal(['a'],0,products,c),['b']);
 assert.equal(recommendShopping(products,{...c,budgetUnlimited:false}),null);
 assert.equal(shoppingBudgetLimit({...c,budgetUnlimited:false}),1000000);
});

test('existing budgets retain their limit and malformed unlimited flags are rejected',()=>{
 assert.equal(shoppingBudgetLimit(initialConditions),50000);
 assert.equal(parseConditions({...unlimited,budgetUnlimited:'true'}),null);
});
