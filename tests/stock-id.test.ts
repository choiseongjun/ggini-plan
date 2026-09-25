import test from 'node:test';
import assert from 'node:assert/strict';
import {validStockId} from '../lib/stock-id';
import {changeStock} from '../lib/shopping-progress';
import {parseShoppingExpense} from '../lib/shopping-expense';
import {parseConditions,initialConditions} from '../lib/shopping-plan';

test('Korean recipe ingredient IDs survive purchase, stock and recommendation validation',()=>{
 const id='recipe-opt-ingredient-ai-양파';
 const stock=changeStock({},[{item:{id,name:'양파',unit:'묶음',url:null},quantity:1}],'buy');
 assert.equal(stock[id].owned,1);
 assert.ok(parseShoppingExpense({id:crypto.randomUUID(),date:'2026-09-25',amount:3000,action:'buy',itemIds:[id]}));
 assert.equal(parseConditions({...initialConditions,supply:{[id]:1}})?.supply?.[id],1);
 for(const invalid of ['__proto__','constructor','prototype','../양파','양파/마늘','<양파>','x'.repeat(101),'']){
  assert.equal(validStockId(invalid),false);
  assert.equal(parseConditions({...initialConditions,supply:JSON.parse(JSON.stringify({[invalid]:1}))}),null);
 }
});
