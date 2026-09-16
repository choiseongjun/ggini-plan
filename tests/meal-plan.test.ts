import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultDiet, parseDiet, recommendMeals, clockTime } from "../lib/meal-plan";
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
    if (meals===2 || meals===3) assert.ok(Math.abs(plan.total-plan.target)<20);
  }
  assert.equal(clockTime(25),"다음 날 01:00");
});
test("plant preference and exclusions always apply, including alternative combinations", () => {
  for(let variant=0;variant<12;variant++) {
    const plan=recommendMeals(profile,{...defaultDiet,style:"plant",excluded:["soy","wheat"]},variant)!;
    for(const meal of plan.meals) {
      assert.ok(meal.styles.includes("plant"));
      assert.ok(!meal.avoid.includes("soy") && !meal.avoid.includes("wheat"));
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
