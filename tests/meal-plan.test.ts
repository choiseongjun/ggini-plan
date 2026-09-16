import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultDiet, excludedFoods, parseDiet, recommendMeals, clockTime } from "../lib/meal-plan";
import type { BodyProfile } from "../lib/body-profile";
const profile: BodyProfile = { height:165,weight:60,age:28,sex:"female",activity:"light",meals:3,pregnancy:false };
test("meal frequency preserves daily energy and respects eating window", () => {
  for (const meals of [1,2,3,4,5,6]) {
    const plan = recommendMeals({...profile,meals},{...defaultDiet,fasting:"16:8",start:12})!;
    assert.equal(plan.target,1829);
    assert.equal(plan.meals.length,meals);
    assert.equal(plan.end,"20:00");
    assert.ok(plan.meals.every(m=>m.time >= "12:00" && m.time < "20:00"));
    assert.equal(plan.total,plan.meals.reduce((s,m)=>s+m.kcal,0));
    assert.ok(plan.meals.every(m=>m.ingredients.every(i=>i.grams>0)));
  }
  assert.equal(clockTime(25),"다음 날 01:00");
});
test("plant preference and exclusions always apply, including alternative combinations", () => {
  for(let variant=0;variant<12;variant++) {
    const plan=recommendMeals(profile,{...defaultDiet,style:"plant",excluded:["oats","wheat"]},variant)!;
    for(const meal of plan.meals) {
      assert.ok(meal.styles.includes("plant"));
      assert.ok(!meal.ingredients.some(i=>i.food==="oats"||i.food==="pasta"));
      assert.ok(meal.ingredients.every(i=>i.grams>0));
    }
  }
  assert.notEqual(recommendMeals(profile,defaultDiet,0)!.meals[0].name,recommendMeals(profile,defaultDiet,1)!.meals[0].name);
});
test("invalid settings rejected and pregnancy recommendations disabled", () => {
  for(const patch of [{start:24},{start:NaN},{fasting:"20:4"},{excluded:["unknown"]},{style:"__proto__"}]) assert.equal(parseDiet({...defaultDiet,...patch}),null);
  assert.equal(recommendMeals({...profile,pregnancy:true},defaultDiet),null);
  assert.ok(recommendMeals({...profile,meals:1},defaultDiet)!.total < 1829*.9);
});

test("expanded exclusions validate and remove actual recipe ingredients",()=>{
 const excluded=Object.keys(excludedFoods) as (keyof typeof excludedFoods)[];
 assert.equal(parseDiet({...defaultDiet,excluded})?.excluded.length,26);
 assert.equal(recommendMeals(profile,{...defaultDiet,excluded}),null);
 for(const key of ['rice','banana','oats'] as const)for(let variant=0;variant<8;variant++){
  const plan=recommendMeals(profile,{...defaultDiet,excluded:[key]},variant);
  assert.ok(plan);
  assert.ok(plan.meals.every(m=>m.ingredients.every(i=>i.food!==key)));
 }
 assert.equal(recommendMeals(profile,{...defaultDiet,style:'plant',excluded:['soy','wheat']}),null);
 assert.ok(recommendMeals(profile,{...defaultDiet,excluded:['onion']})!.meals.every(m=>m.ingredients.every(i=>i.food!=='veg')));
});

test("breakfast remains quick and modest across variants; noon first meal is lunch",()=>{
 for(let variant=0;variant<20;variant++){
  const plan=recommendMeals(profile,defaultDiet,variant)!;
  assert.equal(plan.meals[0].label,'아침');
  assert.ok(plan.meals[0].kcal<=455);
  assert.ok(!plan.meals[0].ingredients.some(i=>i.food==='salmon'||i.food==='chicken'||i.food==='pasta'));
  assert.equal(plan.meals[1].label,'점심');assert.equal(plan.meals[2].label,'저녁');
  assert.ok(plan.meals.every(m=>m.slots.includes(m.slot)));
 }
 assert.equal(recommendMeals(profile,{...defaultDiet,start:12})!.meals[0].label,'점심');
 assert.equal(recommendMeals(profile,{...defaultDiet,excluded:['egg','milk','soy','oats'] }),null);
});

test('cereal breakfasts include milk volume and obey dairy/corn exclusions',()=>{
 const plans=Array.from({length:24},(_,v)=>recommendMeals(profile,defaultDiet,v)!);
 assert.ok(plans.some(p=>p.meals[0].ingredients.some(i=>i.food==='cereal')));
 const milk=plans.flatMap(p=>p.meals[0].ingredients).find(i=>i.food==='milk')!;
 assert.equal(milk.unit,'mL');
 for(const key of ['milk','corn'] as const)for(let v=0;v<24;v++){
  const p=recommendMeals(profile,{...defaultDiet,excluded:[key]},v)!;
  assert.ok(p.meals.every(m=>m.ingredients.every(i=>key==='milk'?!['milk','yogurt'].includes(i.food):i.food!=='cereal')));
 }
});
