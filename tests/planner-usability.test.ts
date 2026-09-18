import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mealRole} from '../lib/meal-role';
import {candidates,initialConditions,parseConditions,mealSchedule,recommendShopping,swapMeal,type PlanProduct,type SwapPreference} from '../lib/shopping-plan';
const p=(id:string,name:string,extra:Partial<PlanProduct>={}):PlanProduct=>({id,name,price:5000,servings:1,category:'ready_meal',productUrl:'https://example.com/'+id,avoidanceText:'쌀',...extra} as PlanProduct);
const c={...initialConditions,days:1,meals:1,budget:10000};
test('simple total meal counts preserve odd totals across selected slots',()=>{
 for(const meals of [3,5,7]){
  const parsed=parseConditions({...c,mealCountMode:true,meals,days:Math.ceil(meals/2),slots:['lunch','dinner']});
  assert.ok(parsed);
  const schedule=mealSchedule(parsed);
  assert.equal(schedule.length,meals);
  assert.deepEqual(schedule[0],{day:1,slot:'lunch'});
  assert.deepEqual(schedule.at(-1),{day:Math.ceil(meals/2),slot:'lunch'});
 }
 assert.equal(parseConditions({...c,mealCountMode:true,meals:3,days:3,slots:['lunch','dinner']}),null);
 assert.equal(parseConditions({...c,meals:3,days:2,slots:['lunch','dinner']}),null);
});
test('ingredients and accompaniments never fill a meal slot on their own',()=>{
 const rows=[p('oil','올리브유'),p('tofu','두부'),p('cereal','시리얼'),p('milk','우유'),p('rice','햇반'),p('soup','미역국'),p('meal','닭가슴살 볶음밥')];
 assert.deepEqual(rows.map(mealRole),['ingredient','side','pairing','pairing','pairing','side','meal']);
 assert.deepEqual(candidates(rows,c).map(p=>p.id),['meal']);
 const combined=p('combined','미역국 + 밥',{recipe:{assembly:true,minutes:0,slots:['dinner'],family:'soup',steps:[],ingredients:[],nutrition:{calories:null,protein:null}}});
 assert.equal(mealRole(combined),'meal');
});
test('price and repetition swaps enforce the selected reason without breaking the budget',()=>{
 const rows=[p('old','새우 볶음밥'),p('same','김치 볶음밥',{price:4000}),p('different','도시락',{price:6000})];
 assert.deepEqual(swapMeal(['old'],0,rows,c,'price'),['same']);
 assert.deepEqual(swapMeal(['old'],0,rows,c,'repeat'),['different']);
 assert.equal(swapMeal(['old'],0,rows,{...c,budget:5000},'repeat'),null);
 assert.equal(swapMeal(['old'],0,rows,c,'effort'),null);
});
test('stored dislike changes future recommendation and rejects malformed feedback',()=>{
 const rows=[p('old','도시락'),p('new','파스타')];
 const feedback:SwapPreference={id:'old',family:'도시락',reason:'taste',price:5000,minutes:5};
 const conditions={...c,swapPreferences:[feedback]};
 assert.ok(parseConditions(JSON.parse(JSON.stringify(conditions))));
 assert.deepEqual(recommendShopping(rows,conditions),['new']);
 assert.equal(parseConditions({...c,swapPreferences:[{...feedback,reason:'oops'}]}),null);
 assert.equal(parseConditions({...c,swapPreferences:Array(51).fill(feedback)}),null);
});
