import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseSaved} from '../toss/src/model';
import {initialConditions,recommendShopping,purchaseBasket,validMealIds,type PlanProduct} from '../lib/shopping-plan';
const products=JSON.parse(fs.readFileSync('toss/public/catalog.json','utf8')).products as PlanProduct[];
test('Toss bundled catalog produces an affordable plan and restores exact pack quantities',()=>{
 const ids=recommendShopping(products,initialConditions)!;assert.ok(ids);assert.ok(validMealIds(ids,products,initialConditions));
 const before=purchaseBasket(ids,products,[]),total=before.reduce((n,r)=>n+r.cost,0);assert.ok(total<=initialConditions.budget);
 const first=before[0],have={[first.product.id]:first.packs};const data={conditions:initialConditions,ids,have};
 assert.deepEqual(parseSaved(JSON.stringify(data),products),data);
 const after=purchaseBasket(ids,products,[],have);assert.equal(after[0].packs,0);assert.equal(after.reduce((n,r)=>n+r.cost,0),total-first.cost);
 assert.equal(parseSaved(JSON.stringify({...data,ids:['missing']}),products),null);
 assert.equal(parseSaved(JSON.stringify({...data,have:{invalid:-1}}),products),null);
 assert.equal(parseSaved('broken json',products),null);
});
