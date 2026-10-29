import {test} from 'node:test';
import assert from 'node:assert/strict';
import {comparableFoods,nutrientPer100,rankComparison,foodComparisonGroup} from '../lib/food-comparison';
import type {FoodReference} from '../lib/food-reference';
const base:FoodReference={code:'pizza',name:'치즈 피자',brand:'A',category:'빵',servingAmount:200,servingUnit:'g',kcal:500,protein:20,carbs:50,fat:10,sugar:4,sodium:600};
test('comparison does not mix burgers, pizzas or mass and volume',()=>{
 const items=[{slug:'burger',food:{...base,code:'burger',name:'치즈 버거'}},{slug:'pizza',food:{...base,code:'other'}},{slug:'volume',food:{...base,code:'volume',servingUnit:'mL'}}];
 assert.deepEqual(comparableFoods(base,items).map(i=>i.slug),['pizza']);
 assert.equal(foodComparisonGroup('알 수 없는 메뉴'),null);
 assert.equal(foodComparisonGroup('커피 라떼'), '라떼');
});
test('sort uses equal quantities, unknown values last and protein descending',()=>{
 const small={slug:'small',food:{...base,code:'small',servingAmount:50,sugar:3,protein:8}};
 const large={slug:'large',food:{...base,code:'large',servingAmount:500,sugar:10,protein:20}};
 const unknown={slug:'unknown',food:{...base,code:'unknown',sugar:null,protein:null}};
 assert.equal(nutrientPer100(base,'kcal'),250);
 assert.deepEqual(rankComparison([small,unknown,large],'sugar').map(i=>i.slug),['large','small','unknown']);
 assert.deepEqual(rankComparison([large,unknown,small],'protein').map(i=>i.slug),['small','large','unknown']);
 assert.equal(nutrientPer100({...base,servingAmount:0},'kcal'),null);
 assert.equal(nutrientPer100({...base,servingUnit:'개'},'kcal'),null);
});
