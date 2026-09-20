import assert from 'node:assert/strict';
import {test} from 'node:test';
import {changeStock,remainingQuantity,parseStock} from '../lib/shopping-progress';
import {basket,basketTotal,initialConditions,recommendShopping,type PlanProduct} from '../lib/shopping-plan';
const item={id:'rice',name:'볶음밥',unit:'묶음',url:'https://example.com/rice'};
test('partial orders, receipts, cancellation and consumption keep quantities without duplicate buying',()=>{
 let stock=changeStock({},[{item,quantity:3}],'order');
 assert.equal(remainingQuantity(4,stock.rice),1);
 stock=changeStock(stock,[{item,quantity:2}],'receive');
 assert.equal(stock.rice.ordered,1);assert.equal(stock.rice.owned,2);
 assert.equal(remainingQuantity(4,stock.rice),1);
 assert.throws(()=>changeStock(stock,[{item,quantity:2}],'receive'));
 stock=changeStock(stock,[{item,quantity:1}],'cancel');
 assert.equal(remainingQuantity(4,stock.rice),2);
 stock=changeStock(stock,[{item,quantity:1}],'consume');
 assert.equal(remainingQuantity(4,stock.rice),3);
 stock=changeStock(stock,[{item,quantity:1}],'buy');assert.equal(stock.rice.owned,2);
});
test('reject unsafe URLs, invalid stock and mismatched units',()=>{
 assert.equal(parseStock({rice:{...item,ordered:-1,owned:0}}),null);
 assert.equal(parseStock({rice:{...item,url:'javascript:alert(1)',ordered:0,owned:0}}),null);
 const stock=changeStock({},[{item,quantity:2}],'have');
 assert.throws(()=>changeStock(stock,[{item:{...item,unit:'g'},quantity:1}],'buy'));
 assert.throws(()=>changeStock(stock,[{item,quantity:0}],'order'));
 assert.throws(()=>changeStock(stock,[{item,quantity:3}],'consume'));
});
test('recommendations charge only the missing packs, including when stock cannot cover the whole plan',()=>{
 const products=[{...item,price:5000,servings:2,category:'frozen_meal',productUrl:item.url,avoidanceText:'없음'} as unknown as PlanProduct];
 const ids=Array(5).fill('rice');
 assert.equal(basket(ids,products,[],{rice:2})[0].packs,3);
 assert.equal(basketTotal(ids,products,[],{rice:2}),5000);
 assert.equal(basketTotal(ids,products,[],{rice:4}),0);
 assert.equal(recommendShopping(products,{...initialConditions,meals:1,days:1,budget:1000,supply:{rice:1}})?.length,1);
 assert.equal(recommendShopping(products,{...initialConditions,meals:1,days:1,budget:1000,supply:{rice:0}}),null);
});
