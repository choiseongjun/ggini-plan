import test from 'node:test';
import assert from 'node:assert/strict';
import {pantryIngredientIndex,pantryIngredientGroup} from '../lib/pantry-ingredient-browser';
import type {PlanProduct} from '../lib/shopping-plan';
test('ingredient browser uses actual recipe ingredients, merges aliases and skips water',()=>{
 const recipe=(names:string[])=>({recipe:{ingredients:names.map(name=>({product:{name}}))}} as PlanProduct);
 const list=pantryIngredientIndex([recipe(['계란','달걀','물','팽이버섯']),recipe(['달걀','백미밥','카놀라유'])]);
 assert.equal(list.find(i=>i.name==='달걀')?.recipeCount,2);
 assert.equal(list.some(i=>i.name==='물'),false);
 assert.equal(list.find(i=>i.name==='팽이버섯')?.group,'채소·과일');
 assert.equal(pantryIngredientGroup('밥'),'밥·면');assert.equal(pantryIngredientGroup('식용유'),'양념');
});
