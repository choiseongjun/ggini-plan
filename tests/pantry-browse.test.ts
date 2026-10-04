import {test} from 'node:test';
import assert from 'node:assert/strict';
import {browsePantryMenus} from '../lib/pantry-browse';
import {pantrySourceProducts} from '../lib/pantry-source-recommendations';
const base=pantrySourceProducts()[0];
const catalog=Array.from({length:45},(_,i)=>({...base,sourceRecipe:undefined,id:`catalog-${i}`,name:`카탈로그 요리 ${i}`}));
const options={owned:[],excluded:[],query:'',offset:0,allowShopping:true};
test('browse includes legacy catalog beyond 30 and pages without repeated menus',()=>{
 const first=browsePantryMenus(catalog,options);
 assert.ok(first.total>30);assert.equal(first.products.length,12);
 const ids=[];
 for(let offset=0;offset<first.total;offset+=12)ids.push(...browsePantryMenus(catalog,{...options,offset}).products.map(p=>p.id));
 assert.equal(new Set(ids).size,first.total);assert.ok(ids.includes('catalog-44'));
});
test('search covers later catalog pages and source versions win duplicate names',()=>{
 const result=browsePantryMenus(catalog,{...options,query:'카탈로그 요리 44'});
 assert.equal(result.total,1);assert.equal(result.products[0].id,'catalog-44');
 const duplicate={...base,id:'duplicate',sourceRecipe:undefined};
 const match=browsePantryMenus([duplicate],{...options,query:base.name});
 assert.ok(match.products.some(p=>p.id===base.id));assert.ok(!match.products.some(p=>p.id==='duplicate'));
});
test('without shopping an empty pantry does not claim a meal is available',()=>{
 assert.equal(browsePantryMenus(catalog,{...options,allowShopping:false}).total,0);
});

test('excluded ingredients stay excluded across catalog pages',()=>{
 const egg=pantrySourceProducts().find(p=>p.name==='달걀볶음밥')!;
 const legacy={...egg,id:'legacy-egg',name:'달걀 새 메뉴',sourceRecipe:undefined};
 const result=browsePantryMenus([legacy],{...options,excluded:['egg'],query:'달걀'});
 assert.equal(result.total,0);
});
