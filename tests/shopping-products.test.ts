import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {CatalogItem} from '../lib/catalog';
import {shoppingProductsFor} from '../lib/shopping-products';
const product=(id:string,name:string,extra:Partial<CatalogItem>={}):CatalogItem=>({id,name,category:'ingredient',price:2000,detail:'300g · 1팩',quantity:300,unit:'g',productUrl:`https://www.kurly.com/goods/${id}`,productImageUrl:null,priceCheckedAt:'2026-10-05T00:00:00Z',...extra} as CatalogItem);

test('cart matches ingredients without matching unrelated foods or brand names',()=>{
 const rows=[product('1','대파 300g'),product('2','스파게티'),product('3','[대파] 두부'),product('4','대파 만두')];
 assert.deepEqual(shoppingProductsFor('파',rows).map(p=>p.id),['1']);
 assert.deepEqual(shoppingProductsFor('물',rows),[]);
});
test('cooked rice can show ready meals but excludes fried rice; raw eggs exclude cooked eggs',()=>{
 assert.deepEqual(shoppingProductsFor('밥',[product('1','즉석밥 210g',{category:'ready_meal'}),product('2','김치볶음밥',{category:'ready_meal'})]).map(p=>p.id),['1']);
 assert.deepEqual(shoppingProductsFor('달걀',[product('1','계란 10구'),product('2','쫄깃한 계란 20개입')]).map(p=>p.id),['1']);
});
test('prepared ingredients do not match a kit or sauce that merely contains them',()=>{
 assert.deepEqual(shoppingProductsFor('장어구이',[product('1','장어구이 200g',{category:'ready_meal'}),product('2','장어구이 덮밥 키트',{category:'meal_kit'}),product('3','장어구이 소스',{category:'other'})]).map(p=>p.id),['1']);
});
test('misclassified prepared products are not substituted for raw chicken or vegetables',()=>{
 const rows=[product('1','냉장 닭가슴살'),product('2','닭가슴살 핫도그'),product('3','닭가슴살 장조림'),product('4','안심 닭가슴살',{detail:'135g · 1캔'}),product('5','한끼 당근'),product('6','양배추 당근 샐러드'),product('7','양파 가루'),product('8','닭가슴살 새우 냉채'),product('9','닭가슴살 큐브')];
 assert.deepEqual(shoppingProductsFor('닭가슴살',rows).map(p=>p.id),['1']);
 assert.deepEqual(shoppingProductsFor('당근',rows).map(p=>p.id),['5']);
 assert.deepEqual(shoppingProductsFor('양파',rows),[]);
});
test('only real priced HTTPS offers are exposed; duplicate URLs are removed',()=>{
 const rows=[product('1','두부'),product('2','두부',{productUrl:'javascript:alert(1)'}),product('3','두부',{price:0}),product('4','두부',{productUrl:'https://www.kurly.com/goods/1'}),product('5','두부',{productUrl:null})];
 const offers=shoppingProductsFor('두부',rows);
 assert.equal(offers.length,1);assert.equal(offers[0].seller,'컬리');
});
test('returns up to three offers and preserves observed price, packaging and date',()=>{
 const rows=[product('1','두부',{price:4000}),product('2','두부',{price:2500}),product('3','두부',{price:3500}),product('4','두부',{price:1000,priceCheckedAt:'2025-01-01T00:00:00Z'})];
 const offers=shoppingProductsFor('두부',rows);
 assert.deepEqual(offers.map(p=>p.id),['2','3','1']);
 assert.equal(offers[0].price,2500);assert.equal(offers[0].detail,'300g · 1팩');assert.equal(offers[0].priceCheckedAt,'2026-10-05T00:00:00Z');
});
