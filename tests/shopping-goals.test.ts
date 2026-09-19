import assert from 'node:assert/strict';
import {test} from 'node:test';
import {goalBonus,productsForGoal} from '../lib/shopping-goals';
import {servingNutrients,nutritionIsEstimated} from '../lib/serving-nutrients';
import {initialConditions,parseConditions,recommendShopping,swapMeal,basketTotal,type PlanProduct,type PlanConditions} from '../lib/shopping-plan';

const meal=(id:string,calories:number|null,protein:number|null,extra:Partial<PlanProduct>={}):PlanProduct=>({
 id,name:'도시락 '+id,price:5000,servings:1,quantity:1,unit:'개',servingGrams:300,category:'frozen_meal',
 productUrl:'https://example.com/'+id,nutritionSourceUrl:'https://example.com/label',nutritionBasis:'300g당',
 caloriesKcal:calories,proteinG:protein,avoidanceText:'쌀, 닭고기',...extra,
} as PlanProduct);
const c:PlanConditions={...initialConditions,days:1,meals:1,budget:10000};

test('diet distinguishes energy at equal protein density and muscle distinguishes high protein portions',()=>{
 assert.ok(goalBonus(meal('lighter',400,20),'lose')>goalBonus(meal('larger',800,40),'lose'));
 const standard=meal('standard',600,35),higher=meal('higher',600,50);
 assert.ok(goalBonus(higher,'muscle')>goalBonus(standard,'muscle'));
 assert.deepEqual(recommendShopping([standard,higher],{...c,goal:'muscle'}),['higher']);
});

test('estimated labels normalize per serving but receive less ranking weight',()=>{
 const known=meal('known',200,12,{nutritionBasis:'100g당',carbohydratesG:25,fatG:6,sodiumMg:200});
 const estimated={...known,nutritionBasis:'100g당 · 추정 포함'};
 assert.deepEqual(servingNutrients(estimated),{calories:600,protein:36,carbs:75,fat:18,sodium:600});
 assert.equal(nutritionIsEstimated(estimated),true);
 for(const goal of ['maintain','lose','muscle','lowfat'] as const){
  assert.ok(goalBonus(estimated,goal)>0);
  assert.ok(goalBonus(estimated,goal)<goalBonus(known,goal));
 }
});

test('ambiguous serving bases and missing nutrients stay unknown',()=>{
 for(const nutritionBasis of ['100ml당','면 100g, 소스 20g','1팩당']){
  assert.equal(servingNutrients(meal('unknown',200,12,{nutritionBasis})).calories,null);
 }
 const n=servingNutrients(meal('partial',400,20,{fatG:0,sodiumMg:null}));
 assert.equal(n.fat,0);assert.equal(n.sodium,null);assert.equal(n.carbs,null);
 assert.equal(servingNutrients(meal('unknown-weight',400,20,{servingGrams:undefined})).calories,null);
});

test('balanced meals compare macro composition and sodium without bypassing budget',()=>{
 const balanced=meal('balanced',500,25,{carbohydratesG:60,fatG:18,sodiumMg:400});
 const salty={...balanced,id:'salty',sodiumMg:1600};
 assert.ok(goalBonus(balanced)>goalBonus(salty));
 assert.deepEqual(recommendShopping([salty,balanced],c),['balanced']);
});

test('goals survive saved condition round trips; legacy conditions remain valid and invalid goals fail',()=>{
 for(const goal of ['maintain','lose','muscle'] as const)assert.equal(parseConditions(JSON.parse(JSON.stringify({...c,goal})))?.goal,goal);
 assert.ok(parseConditions(c));
 for(const goal of ['extreme','toString',null,{},1])assert.equal(parseConditions({...c,goal}),null);
});
test('actual recommendations and replacements use the selected goal',()=>{
 const rich=meal('rich',650,35),lean=meal('lean',450,25),old=meal('old',800,10);
 assert.deepEqual(recommendShopping([rich,lean],c),['lean']);
 assert.deepEqual(recommendShopping([rich,lean],{...c,goal:'lose'}),['lean']);
 assert.deepEqual(recommendShopping([lean,rich],{...c,goal:'muscle'}),['rich']);
 assert.deepEqual(swapMeal(['old'],0,[old,rich,lean],{...c,goal:'lose'}),['lean']);
 assert.deepEqual(swapMeal(['old'],0,[old,lean,rich],{...c,goal:'muscle'}),['rich']);
});
test('missing, unsourced and zero-energy values do not receive a nutrition bonus; input stays unchanged',()=>{
 const products=[meal('missing',null,30),meal('unsourced',400,30,{nutritionSourceUrl:null}),meal('zero',0,30),meal('unknown-protein',400,null)];
 for(const p of products)for(const goal of ['lose','muscle'] as const)assert.equal(goalBonus(p,goal),0);
 const known=meal('known',400,30,{personalizationScore:50});const ranked=productsForGoal([known],'muscle');
 assert.equal(known.personalizationScore,50);assert.ok(ranked[0].personalizationScore!>50);
 assert.ok(productsForGoal([known],'maintain')[0].personalizationScore!>50);
});
test('goal preferences cannot bypass budgets, exclusions or breakfast eligibility',()=>{
 const rows=[meal('affordable',500,15),meal('expensive',450,60,{price:20000}),meal('shrimp',400,70,{avoidanceText:'새우 함유'})];
 for(const goal of ['lose','muscle'] as const){
  const conditions={...c,goal,budget:5000,excluded:['shrimp'] as ['shrimp']};
  const ids=recommendShopping(rows,conditions)!;assert.deepEqual(ids,['affordable']);assert.equal(basketTotal(ids,rows,[]),5000);
  assert.equal(recommendShopping(rows,{...conditions,slots:['breakfast']}),null);
 }
});

test('budget modes change price preference and never exceed the cap',()=>{
 const cheap=meal('cheap',500,25,{price:3000}),expensive=meal('expensive',500,25,{price:8000});
 assert.deepEqual(recommendShopping([cheap,expensive],{...c,budgetMode:'save'}),['cheap']);
 assert.deepEqual(recommendShopping([cheap,expensive],{...c,budgetMode:'full'}),['expensive']);
 assert.deepEqual(recommendShopping([cheap,expensive],{...c,budget:5000,budgetMode:'full'}),['cheap']);
 for(const budgetMode of ['save','balanced','full'] as const)assert.equal(parseConditions({...c,budgetMode})?.budgetMode,budgetMode);
 assert.equal(parseConditions({...c,budgetMode:'unlimited'}),null);
});
test('low fat compares sourced serving fat; missing nutrition is not substituted',()=>{
 const low=meal('low',500,20,{fatG:4}),high=meal('high',500,20,{fatG:25}),missing=meal('missing',500,20,{fatG:null});
 assert.deepEqual(recommendShopping([high,missing,low],{...c,goal:'lowfat'}),['low']);
 assert.equal(recommendShopping([missing],{...c,goal:'lowfat'}),null);
 assert.equal(recommendShopping([meal('unknown',null,null)],{...c,goal:'muscle'}),null);
 assert.ok(parseConditions({...c,goal:'lowfat'}));
});
