import test from 'node:test';
import assert from 'node:assert/strict';
import {applyMarketPrices,marketPricePerGram} from '../lib/market-ingredient-prices';
import type {RegionalPrice} from '../lib/regional-price-recommendations';
import type {PlanProduct} from '../lib/shopping-plan';

const row=(name:string,variety:string,unit:string,price:number,grade='상품'):RegionalPrice=>({source:'kamis-computed',region:'전국',name,variety,grade,unit,price,previous:null,date:'2026-10-06',previousDate:'2026-09-29'});
const ingredient=(id:string,name:string,quantity:number,price:number)=>({id,name,unit:'g',quantity,price} as PlanProduct);
const recipe=(id:string,parts:{product:PlanProduct;packs:number}[],price:number)=>({id,price,recipe:{ingredients:parts.map(p=>({...p,label:p.product.name}))}} as unknown as PlanProduct);

test('weight series give a per-gram price and record the evidence',()=>{
 const onion=marketPricePerGram('양파(생것)',[row('양파','양파','1kg',2210)]);
 assert.equal(onion?.perGram,2.21);
 assert.deepEqual(onion?.price,{region:'전국',date:'2026-10-06',computed:true,series:'양파 양파 1kg'});
 assert.equal(marketPricePerGram('파',[row('파','쪽파','1kg',9000),row('파','대파','1kg',2610)])?.perGram,2.61);
});

test('eggs use the reviewed 60g per egg and cooked rice the 2.3x ratio',()=>{
 assert.equal(marketPricePerGram('달걀',[row('계란','특란10구','10구',4200,'일반란')])?.perGram,7);
 assert.equal(marketPricePerGram('밥',[row('쌀','20kg','20kg',62100)])?.perGram,62100/20000/2.3);
 assert.equal(marketPricePerGram('양배추',[row('양배추','양배추','1포기',3800)]),null);
});

test('recipes move by the ingredient cost change only',()=>{
 const onion=ingredient('onion','양파',1000,2500),pantry=ingredient('salt','소금',100,0);
 const dish=recipe('dish',[{product:onion,packs:0.1},{product:pantry,packs:0.01}],1000);
 const [priced]=applyMarketPrices([dish],[row('양파','양파','1kg',2210)]);
 assert.equal(priced.recipe!.ingredients[0].product.price,2210);
 assert.ok(priced.recipe!.ingredients[0].product.marketPrice);
 assert.equal(priced.recipe!.ingredients[1].product,pantry);
 assert.equal(priced.price,1000-29);
});

test('implausible unit gaps, missing rows and assembled meals keep the estimate',()=>{
 const onion=ingredient('onion','양파',1000,2500);
 const dish=recipe('dish',[{product:onion,packs:0.1}],1000);
 assert.equal(applyMarketPrices([dish],[row('양파','양파','1kg',20000)])[0],dish);
 assert.equal(applyMarketPrices([dish],[])[0],dish);
 const assembly={...dish,recipe:{...dish.recipe!,assembly:true}} as PlanProduct;
 assert.equal(applyMarketPrices([assembly],[row('양파','양파','1kg',2210)])[0],assembly);
});
