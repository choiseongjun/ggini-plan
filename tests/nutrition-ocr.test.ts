import { strict as assert } from "node:assert";
import { test } from "node:test";
import { extractNutrition } from "../lib/nutrition-ocr";

test("reads a clear Korean nutrition label", () => {
  assert.deepEqual(extractNutrition("1회 제공량 100g\n열량 110kcal\n탄수화물 3g\n단백질 23g\n지방 1g\n나트륨 35mg"), {
    nutritionBasis: "100g당", caloriesKcal: 110, proteinG: 23,
    carbohydratesG: 3, fatG: 1, sodiumMg: 35,
  });
});

test("does not turn an unreadable label into nutrient values", () => {
  assert.deepEqual(extractNutrition("단백질 239 지방 19"), {
    nutritionBasis: null, caloriesKcal: null, proteinG: null,
    carbohydratesG: null, fatG: null, sodiumMg: null,
  });
});

test("uses the printed per-100g basis instead of the package weight", () => {
  assert.deepEqual(extractNutrition("칼국수 영양정보\n총 내용량 150g\n100g당 275kcal\n나트륨 270mg 탄수화물 61g\n지방 0.3g 단백질 7g"), {
    nutritionBasis: "100g당", caloriesKcal: 275, proteinG: 7,
    carbohydratesG: 61, fatG: 0.3, sodiumMg: 270,
  });
});

test("does not combine noodle and stock tables into whole-kit nutrition", () => {
  const result = extractNutrition("칼국수 영양정보\n100g당 275kcal\n단백질 7g\n치킨스톡 영양정보\n100g당 75kcal\n단백질 2g");
  assert.ok(Object.values(result).every(value => value === null));
});

test("keeps line boundaries and does not borrow another nutrient's value", () => {
  const result = extractNutrition("나트륨\n단백질 7g\n지방\n포화지방 0.2g");
  assert.equal(result.sodiumMg, null);
  assert.equal(result.fatG, null);
  assert.equal(result.proteinG, 7);
});
