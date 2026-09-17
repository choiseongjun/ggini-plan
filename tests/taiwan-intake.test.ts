import test from 'node:test';
import assert from 'node:assert/strict';
import {taiwanIntakeData,updateTaiwanIntake,taiwanStockKey} from '../lib/taiwan-intake';
import type {PlanProduct} from '../lib/shopping-plan';
test('Taiwan intake uses TWD cents, consumes only eaten portions, retries once and restores stock',async()=>{
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:undefined}});
 const memory=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v)}});
 const koreanKey='kkiniplan-progress-products-guest';memory.set(koreanKey,'unchanged');
 const product={id:'tw-test',name:'測試餐點',servings:1,servingGrams:270,nutritionBasis:'270g',nutritionSourceUrl:'https://example.com/label',caloriesKcal:475,proteinG:20,price:10300,productImageUrl:null,servingNote:'270g／份'} as PlanProduct;
 memory.set(taiwanStockKey,JSON.stringify({stock:{'tw-test':{id:'tw-test',name:product.name,unit:'묶음',owned:2,ordered:0,url:null}},version:0}));
 const command={action:'eat' as const,id:'test-command',version:0,productId:product.id,portions:.5};
 await updateTaiwanIntake(command,[product],'2026-09-18');await updateTaiwanIntake(command,[product],'2026-09-18');
 let data=taiwanIntakeData([product],'2026-09-18');
 assert.equal(data.logs.length,1);assert.equal(data.logs[0].cost,5150);assert.equal(data.logs[0].calories,237.5);assert.equal(data.logs[0].protein,10);assert.equal(data.products[0].available,1.5);
 await assert.rejects(updateTaiwanIntake({...command,id:'stale'},[product],'2026-09-18'));
 await updateTaiwanIntake({action:'undo',id:command.id,version:data.version},[product],'2026-09-18');
 data=taiwanIntakeData([product],'2026-09-18');assert.equal(data.logs.length,0);assert.equal(data.products[0].available,2);assert.equal(memory.get(koreanKey),'unchanged');
});
