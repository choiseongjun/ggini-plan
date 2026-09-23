// One-time/resumable backfill: replaces each recipe's deterministic (26-generic-ingredient) mix with
// a GPT-composed realistic ingredient list (lib/recipe-ai-ingredients.ts). Costs real OpenAI API usage
// (~$2-5 for the full run on gpt-4.1, text-only) — resumable via skipping rows that already have
// ai_ingredients, so an interrupted run can just be re-invoked.
import {listRecipeOptimizerResultsMissingAiIngredients, saveAiIngredients} from '../lib/recipe-optimizer-store.ts';
import {synthesizeRealisticIngredients} from '../lib/recipe-ai-ingredients.ts';

const SERVING_SCALE = 3;
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

const missing = await listRecipeOptimizerResultsMissingAiIngredients();
const batch = missing.slice(0, limit);
console.log(`AI 재료 없는 레시피 ${missing.length}건 중 이번 실행에서 ${batch.length}건 처리합니다.`);
let saved = 0, failed = 0;
for (const [i, dish] of batch.entries()) {
 try {
  const servingGrams = Math.round(dish.totalGrams * SERVING_SCALE);
  const target = {
   kcal: dish.target.kcal * SERVING_SCALE, protein: dish.target.protein * SERVING_SCALE, fat: dish.target.fat * SERVING_SCALE,
   carbohydrate: dish.target.carbohydrate * SERVING_SCALE, sugar: dish.target.sugar * SERVING_SCALE, sodium: dish.target.sodium * SERVING_SCALE,
  };
  const {ingredients, note} = await synthesizeRealisticIngredients({name: dish.targetName, servingGrams, target});
  await saveAiIngredients(dish.foodCode, ingredients, note);
  saved++;
  console.log(`[${i + 1}/${batch.length}] ${dish.targetName} -> ${ingredients.map((x) => `${x.name} ${x.grams}g`).join(', ')}`);
 } catch (e) {
  failed++;
  console.log(`[${i + 1}/${batch.length}] 실패: ${dish.targetName} (${e instanceof Error ? e.message : e})`);
 }
}
console.log(`완료: 저장 ${saved}건, 실패 ${failed}건. 남은 미처리 ${missing.length - batch.length}건.`);
process.exit(0);
