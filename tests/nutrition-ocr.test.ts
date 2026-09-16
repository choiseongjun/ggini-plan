import { strict as assert } from "node:assert";
import { test } from "node:test";
import { extractNutrition } from "../lib/nutrition-ocr";

test("reads a clear Korean nutrition label", () => {
  assert.deepEqual(extractNutrition("1회 제공량 100g\n열량 110kcal\n탄수화물 3g\n단백질 23g\n지방 1g\n나트륨 35mg"), {
    nutritionBasis: "100g당", caloriesKcal: 110, proteinG: 23,
    carbohydratesG: 3, fatG: 1, sodiumMg: 35,
  });
});

test("combines Korean labels with English unit recognition", () => {
  const korean = "영 양 정보 1 회 제 공 량 1009\n열량 110<<3! 탄수화물 39\n단백질 239 지방 19\n나트륨 3509";
  const english = "FLEE 12 MSH 100g\nEE 110kcal Et3tE 3g\nCHE 23g X|&H 1g\nLIEE 35mg";
  assert.deepEqual(extractNutrition(korean, english), {
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
