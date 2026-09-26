import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyPairings,composePairing,proposePairings,type Pairing} from '../lib/meal-pairings';
import {basketTotal,candidates,dishBase,dishWords,initialConditions,parseConditions,type PlanProduct} from '../lib/shopping-plan';
const ingredient={id:'rice',name:'쌀',price:2000,servings:1,allergens:['rice'],avoidanceText:'쌀',nutritionBasis:'100g당',nutritionSourceUrl:'https://example.com',servingGrams:100,caloriesKcal:200,proteinG:5,carbohydratesG:40,fatG:1,sodiumMg:0} as unknown as PlanProduct;
function dish(id:string,name:string,side=false):PlanProduct{return {...ingredient,id,name,servings:1,price:side?400:1000,productUrl:null,recipe:{minutes:10,slots:['dinner'],family:'test',ingredients:[{product:ingredient,packs:side?.2:.5,label:side?'반찬 재료':'함께 먹는 밥: 쌀 50g'}],steps:['익혀요'],nutrition:{calories:side?40:500,protein:side?1:20}}};}
const main=dish('recipe-opt-main','제육볶음'),side=dish('recipe-opt-side','오이무침',true);
const r:Pairing={anchor_id:main.id,companion_id:side.id,template_id:'rice-meal',slot:'side',relation_type:'pairing',score:80,reason:'검수 이유',score_details:{role:80},source:'test',status:'approved'};
test('only approved compatible pairings are used; avoid has priority; substitute is not an addition',()=>{
 assert.equal(applyPairings([main],[side],[{...r,status:'suggested'}]).length,1);
 assert.equal(applyPairings([main],[side],[{...r,relation_type:'substitute'}]).length,1);
 assert.equal(applyPairings([main],[side],[r,{...r,relation_type:'avoid_pairing'}]).length,1);
 assert.equal(applyPairings([main],[side],[{...r,template_id:'pasta-meal'}]).length,1);
 assert.equal(applyPairings([main],[],[r]).length,1);
 assert.equal(applyPairings([main],[side],[r]).length,2);
});
test('composition counts rice once, preserves ingredient pooling and one-person nutrition',()=>{
 const combo=composePairing(main,[side],[r]);
 assert.equal(combo.recipe!.ingredients.length,2);assert.equal(combo.recipe!.nutrition.calories,540);assert.equal(combo.price,1400);
 assert.equal(basketTotal([combo.id],[combo],[],{},2),4000);
 assert.equal(combo.recipe!.composition!.items[1].reason,'검수 이유');
 r.reason='changed';assert.equal(combo.recipe!.composition!.items[1].reason,'검수 이유');r.reason='검수 이유';
 assert.equal(candidates([combo],{...initialConditions,mealMode:'cook',sideCount:1,avoid:'쌀'}).length,0);
});
test('proposals are bounded and provenance is explicitly rule-based',()=>{
 const rows=proposePairings([main],Array.from({length:12},(_,n)=>dish(`recipe-opt-side${n}`,'나물무침',true)));
 assert.equal(rows.length,4);assert.ok(rows.every(r=>r.status==='suggested'&&r.source==='classification-rules-v1'));
 assert.equal(proposePairings([{...main,recipe:{...main.recipe!,ingredients:[]}}],[side]).length,0);
});
test('selected side count survives conditions and only selects matching approved compositions',()=>{
 const second=dish('recipe-opt-second','숙주나물',true);
 const products=applyPairings([main],[side,second],[r,{...r,companion_id:second.id}]);
 for(const sideCount of [0,1,2]){
  const conditions=parseConditions({...initialConditions,sideCount,cookingEffort:'relaxed',mealMode:'cook'});
  assert.ok(conditions);
  const choices=candidates(products,conditions);
  assert.ok(choices.length);
  assert.ok(choices.every(p=>(p.recipe?.sideCount??0)===sideCount));
 }
 const combo=products.find(p=>p.recipe?.sideCount===2)!;
 assert.equal(combo.recipe!.nutrition.calories,580);
 assert.equal(combo.recipe!.ingredients.filter(i=>i.label.startsWith('함께 먹는 밥')).length,1);
 assert.equal(dishBase(combo),dishBase(main));
 assert.equal(dishWords(combo),dishWords(main));
 assert.equal(candidates(products,{...initialConditions,mealMode:'cook',cookingEffort:'relaxed',sideCount:2,avoid:'쌀'}).length,0);
});
