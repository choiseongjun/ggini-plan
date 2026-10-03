import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allowsCookingEffort,recipeEffort} from '../lib/cooking-effort';
import {initialConditions,parseConditions,candidates,validSwapPreferences,type PlanProduct} from '../lib/shopping-plan';
const dish=(name:string,minutes=20,id='recipe-opt-example')=>({id,name,price:5000,servings:1,servingNote:'1인분',avoidanceText:'',recipe:{minutes,slots:['dinner'],family:'test',ingredients:[],steps:['재료를 평소 조리법대로 준비해요.'],nutrition:{calories:500,protein:25}}} as unknown as PlanProduct);
test('new recommendations default to easy and preferences survive serialization',()=>{
 assert.equal(initialConditions.cookingEffort,'easy');
 for(const cookingEffort of ['easy','everyday','relaxed'])assert.equal(parseConditions(JSON.parse(JSON.stringify({...initialConditions,cookingEffort})))?.cookingEffort,cookingEffort);
 assert.equal(parseConditions({...initialConditions,cookingEffort:'unknown'}),null);
 assert.ok(parseConditions({...initialConditions,cookingEffort:undefined}));
});
test('missing duration is not classified as a zero-minute recipe or replaced in saved feedback',()=>{
 const p=dish('이름 미확인 요리',20,'cook-unknown');
 p.recipe!.minutes=null;
 assert.equal(recipeEffort(p),'everyday');
 assert.equal(allowsCookingEffort(p,'easy'),false);
 const preference={id:p.id,family:'test',reason:'taste',price:5000,minutes:null};
 assert.equal(validSwapPreferences([preference]),true);
 assert.equal(parseConditions({...initialConditions,swapPreferences:[preference]})?.swapPreferences?.[0].minutes,null);
 assert.equal(validSwapPreferences([{...preference,minutes:15}]),true,'existing saved feedback stays readable');
 assert.equal(validSwapPreferences([{...preference,minutes:'15'}]),false);
});
test('placeholder time does not make fish steaming or elaborate recipes easy',()=>{
 for(const name of ['조기찜','갈치조림','잡채','갈비찜','새우튀김']){
  const p=dish(name,10);assert.equal(recipeEffort(p),'relaxed');assert.equal(allowsCookingEffort(p,'easy'),false);assert.equal(allowsCookingEffort(p,'everyday'),false);assert.equal(allowsCookingEffort(p,'relaxed'),true);
 }
 assert.equal(recipeEffort(dish('김치볶음밥')),'easy');
 assert.equal(recipeEffort(dish('된장찌개')),'everyday');
 assert.equal(recipeEffort(dish('이름 미확인 요리')),'everyday');
});
test('shared candidate filter enforces effort for recommendations and swaps',()=>{
 const products=[dish('김치볶음밥'),dish('조기찜',20,'fish'),dish('된장찌개',20,'soup')];
 const c={...initialConditions,mealMode:'cook' as const};
 assert.deepEqual(candidates(products,c).map(p=>p.name),['김치볶음밥']);
 assert.deepEqual(candidates(products,{...c,cookingEffort:'everyday'}).map(p=>p.name),['김치볶음밥','된장찌개']);
 assert.equal(candidates(products,{...c,cookingEffort:'relaxed'}).length,3);
 assert.equal(candidates(products,{...c,cookingEffort:undefined}).length,3);
});
