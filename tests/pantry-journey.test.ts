import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseJourney,todayMeal,recentRecipeIds,mealDate,journeyKey,type PantryMeal} from '../lib/pantry-journey';
const meal:PantryMeal={id:'11111111-1111-4111-8111-111111111111',recipeId:'source-test',name:'계란밥',eatenAt:'2026-10-02T16:00:00.000Z',status:'saved'};
test('malformed storage does not break home and guest/account namespaces stay separate',()=>{
 assert.deepEqual(parseJourney('{bad'),{meals:[],favorites:[]});
 assert.deepEqual(parseJourney(JSON.stringify({meals:[null,{},meal],favorites:[null,7,'source-test','source-test']})),{meals:[meal],favorites:['source-test']});
 assert.notEqual(journeyKey(),journeyKey('a'));assert.notEqual(journeyKey('a'),journeyKey('b'));
});
test('same KST day reuses an existing request, including pending retries',()=>{
 assert.equal(mealDate(meal.eatenAt),'2026-10-03');
 assert.equal(todayMeal([meal],meal.recipeId,'2026-10-03')?.id,meal.id);
 assert.equal(todayMeal([{...meal,status:'pending'}],meal.recipeId,'2026-10-03')?.id,meal.id);
 assert.equal(todayMeal([meal],meal.recipeId,'2026-10-04'),undefined);
});
test('recommendation history excludes failed, future and old records',()=>{
 const now=Date.parse('2026-10-03T00:00:00Z');
 assert.deepEqual(recentRecipeIds([meal,{...meal,recipeId:'source-pending',status:'pending'},{...meal,recipeId:'source-old',eatenAt:'2026-09-01T00:00:00Z'},{...meal,recipeId:'source-future',eatenAt:'2026-11-01T00:00:00Z'}],now),[meal.recipeId]);
});
