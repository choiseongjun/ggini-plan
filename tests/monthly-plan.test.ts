import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeMonth,ingredientBasket,selectedWeek,validMonth} from '../lib/monthly-plan';
import {defaultDiet} from '../lib/meal-plan';
import type {CatalogItem} from '../lib/catalog';
const profile={height:165,weight:60,age:28,sex:'female' as const,activity:'light' as const,meals:3,pregnancy:false};
test('full calendar includes leap day and date-specific meals with ingredient totals',()=>{
 const days=makeMonth('2028-02',profile,defaultDiet,[])!;
 assert.equal(days.length,29);assert.equal(days.at(-1)?.date,'2028-02-29');
 assert.ok(days.every(d=>d.recommendation.meals.length===3&&d.recommendation.meals[0].slot==='breakfast'));
 const week=selectedWeek(days,'2028-02-26');assert.equal(week.length,4);
 const rows=ingredientBasket(week,[]);
 const oil=rows.find(r=>r.food==='oil')!;
 assert.equal(oil.grams,week.flatMap(d=>d.recommendation.meals).flatMap(m=>m.ingredients).filter(i=>i.food==='oil').reduce((s,i)=>s+i.grams,0));
 assert.equal(oil.product,null);assert.equal(oil.cost,null);
 assert.equal(ingredientBasket(week,[],['oil']).find(r=>r.food==='oil')?.cost,0);
 assert.equal(validMonth('2026-13'),false);
});
test('pack costs round up and missing conversion is not fabricated',()=>{
 const days=makeMonth('2026-09',profile,defaultDiet,[])!.slice(0,7);
 const p={id:'tofu',name:'두부',detail:'300g',unit:'g',quantity:300,price:2000,productUrl:'https://example.com/tofu'} as CatalogItem;
 const rows=ingredientBasket(days,[p]);const tofu=rows.find(r=>r.food==='tofu')!;
 assert.equal(tofu.packs,Math.ceil(tofu.grams/300));assert.equal(tofu.cost,tofu.packs!*2000);
 const egg={...p,id:'eggs',name:'달걀',unit:'개',quantity:20} as CatalogItem;
 assert.equal(ingredientBasket(days,[egg]).find(r=>r.food==='egg')?.packs,null);
});
