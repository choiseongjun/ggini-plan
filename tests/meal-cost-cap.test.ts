import assert from 'node:assert/strict';
import {test} from 'node:test';
import {candidates,initialConditions,parseConditions,recommendShopping,validMealIds,type PlanProduct} from '../lib/shopping-plan';
import {shoppingAvailabilityMessage} from '../lib/shopping-availability';

const dish=(id:string,name:string,price:number)=>({id,name,price,emoji:'',detail:'1인분',portions:'1인분',protein:'',color:'',searchQuery:name,quantity:1,unit:'개',servingNote:'1인분',servings:1,category:'other',avoidanceText:'',recipe:{minutes:5,slots:['breakfast','lunch','dinner'],family:id,steps:[],ingredients:[],nutrition:{calories:400,protein:15}}} as unknown as PlanProduct);
const products=[dish('a','고추장계란볶음밥',892),dish('b','두부구이',500),dish('c','감자국',499)];
const conditions={...initialConditions,mealMode:'cook' as const,days:1,meals:3,slots:['breakfast','lunch','dinner'] as ('breakfast'|'lunch'|'dinner')[],people:4,budget:1000000,budgetUnlimited:true,mealCostCap:500};

test('500-won cap excludes an 892-won meal for four people and explains insufficient options',()=>{
 assert.deepEqual(candidates(products,conditions).map(p=>p.id),['b','c']);
 assert.equal(recommendShopping(products,conditions),null);
 assert.equal(validMealIds(['a','b','c'],products,conditions),false);
 const message=shoppingAvailabilityMessage(products,conditions)!;
 assert.match(message,/500원 이하/);
 assert.match(message,/메뉴가 2개/);
 assert.match(message,/상한을 높이거나 비워/);
 assert.doesNotMatch(message,/예산을 올려도/);
});
test('clearing or raising the cap restores candidates without multiplying it by headcount',()=>{
 assert.equal(candidates(products,{...conditions,mealCostCap:undefined}).length,3);
 assert.equal(candidates(products,{...conditions,mealCostCap:892}).length,3);
 assert.deepEqual(candidates(products,{...conditions,people:1}),candidates(products,conditions));
 const restored=parseConditions(JSON.parse(JSON.stringify(conditions)))!;
 assert.equal(restored.mealCostCap,500);
 for(const mealCostCap of [499,50001,NaN,'500'])assert.equal(parseConditions({...conditions,mealCostCap}),null);
});
