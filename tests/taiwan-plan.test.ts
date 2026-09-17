import assert from 'node:assert/strict';
import {test} from 'node:test';
import manifest from '../data/taiwan-catalog.json';
import {buildTaiwanPlan,restoreTaiwanPlan,taiwanProductsOnly,twMoney,type TaiwanProduct} from '../lib/taiwan-plan';
const products=manifest.products.map(p=>({id:p.id,name:p.name,market:'TW',currency:'TWD',locale:'zh-TW',minorUnits:2,price:p.priceMinor,productUrl:p.productUrl,servings:1,slots:p.mealSlots})) as TaiwanProduct[];
test('Taiwan uses local TWD minor units and rejects cross-market products',()=>{
 assert.equal(twMoney(7200),'NT$72');
 assert.equal(taiwanProductsOnly([...products,{...products[0],market:'KR'},{...products[0],currency:'KRW'}]).length,8);
});
test('15-day lunch/dinner plan stays in budget and varies the catalog',()=>{
 const settings={days:15,slots:['lunch','dinner'] as ('lunch'|'dinner')[],budgetMinor:216000};
 const meals=buildTaiwanPlan(products,settings,'2026-09-17',()=>0);
 assert.equal(meals.length,30);assert.equal(meals[29].date,'2026-10-01');
 assert.equal(new Set(meals.map(m=>m.productId)).size,8);
 assert.ok(meals.reduce((sum,m)=>sum+products.find(p=>p.id===m.productId)!.price,0)<=settings.budgetMinor);
 assert.deepEqual(buildTaiwanPlan(products,{...settings,budgetMinor:200999}),[]);
 assert.equal(buildTaiwanPlan(products,{...settings,budgetMinor:201000}).length,30);
});
test('restore rejects wrong market, missing products and malformed progress',()=>{
 const settings={days:1,slots:['dinner'] as ('lunch'|'dinner')[],budgetMinor:7200};
 const meals=buildTaiwanPlan(products,settings,'2026-09-17');const saved={market:'TW',currency:'TWD',settings,meals};
 assert.deepEqual(restoreTaiwanPlan(JSON.stringify(saved),products),{settings,meals});
 assert.equal(restoreTaiwanPlan(JSON.stringify({...saved,market:'KR'}),products),null);
 assert.equal(restoreTaiwanPlan(JSON.stringify(saved),[]),null);
 assert.equal(restoreTaiwanPlan(JSON.stringify({...saved,meals:[{...meals[0],eaten:true,prepared:false}]}),products),null);
});
