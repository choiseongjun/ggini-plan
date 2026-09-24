import {getPool} from './db';
import type {GeneratedRecipe} from './recipe-optimizer';
import type {AiIngredient} from './recipe-ai-ingredients';

export type StoredRecipeResult = GeneratedRecipe & {foodCode: string; createdAt: string; imageUrl: string | null; imageUrls: string[] | null; aiIngredients: {ingredients: AiIngredient[]; note: string} | null; source: string};

export async function saveRecipeOptimizerResult(foodCode: string, recipe: GeneratedRecipe): Promise<void> {
 await getPool().query(
  `INSERT INTO recipe_optimizer_results (food_code, target_name, target_basis_amount, template_id, template_name, total_grams, ingredients, target, predicted, error, score, updated_at)
   VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11,NOW())
   ON CONFLICT (food_code) DO UPDATE SET target_name=$2, target_basis_amount=$3, template_id=$4, template_name=$5, total_grams=$6,
    ingredients=$7::jsonb, target=$8::jsonb, predicted=$9::jsonb, error=$10::jsonb, score=$11, updated_at=NOW()`,
  [foodCode, recipe.targetName, recipe.targetBasisAmount, recipe.templateId, recipe.templateName, recipe.totalGrams,
   JSON.stringify(recipe.ingredients), JSON.stringify(recipe.target), JSON.stringify(recipe.predicted), JSON.stringify(recipe.error), recipe.score],
 );
}

export async function listRecipeOptimizerResults(): Promise<StoredRecipeResult[]> {
 const {rows} = await getPool().query('SELECT * FROM recipe_optimizer_results ORDER BY created_at DESC');
 return rows.map((r) => ({
  foodCode: r.food_code, targetName: r.target_name, targetBasisAmount: r.target_basis_amount, templateId: r.template_id, templateName: r.template_name,
  totalGrams: Number(r.total_grams), ingredients: r.ingredients, target: r.target, predicted: r.predicted, error: r.error,
  score: Number(r.score), createdAt: r.created_at.toISOString(), imageUrl: r.image_url, imageUrls: r.image_urls, aiIngredients: r.ai_ingredients, source: r.source ?? 'optimizer',
 }));
}

// Populated separately by scripts/synthesize-ai-ingredients.mjs (GPT-composed realistic ingredients),
// not by saveRecipeOptimizerResult — regenerating a recipe's deterministic nutrition fit shouldn't
// discard the AI-composed ingredient list layered on top of it.
export async function saveAiIngredients(foodCode: string, ingredients: AiIngredient[], note: string): Promise<void> {
 await getPool().query('UPDATE recipe_optimizer_results SET ai_ingredients = $1::jsonb WHERE food_code = $2', [JSON.stringify({ingredients, note}), foodCode]);
}

export async function listRecipeOptimizerResultsMissingAiIngredients(): Promise<{foodCode: string; targetName: string; targetBasisAmount: string; totalGrams: number; target: GeneratedRecipe['target']}[]> {
 const {rows} = await getPool().query('SELECT food_code, target_name, target_basis_amount, total_grams, target FROM recipe_optimizer_results WHERE ai_ingredients IS NULL ORDER BY food_code');
 return rows.map((r) => ({foodCode: r.food_code, targetName: r.target_name, targetBasisAmount: r.target_basis_amount, totalGrams: Number(r.total_grams), target: r.target}));
}

// Populated separately by scripts/import-recipe-images.mjs (Kakao Daum Image Search backfill), not by
// saveRecipeOptimizerResult — regenerating a recipe's nutrition/ingredients shouldn't discard its photos.
// image_url mirrors urls[0] so the plain single-photo readers (product-thumb fallback) keep working.
export async function setRecipeOptimizerImages(foodCode: string, urls: string[]): Promise<void> {
 await getPool().query('UPDATE recipe_optimizer_results SET image_url = $1, image_urls = $2::jsonb WHERE food_code = $3', [urls[0] ?? null, JSON.stringify(urls), foodCode]);
}

export async function listRecipeOptimizerResultsMissingImage(): Promise<{foodCode: string; targetName: string}[]> {
 const {rows} = await getPool().query('SELECT food_code, target_name FROM recipe_optimizer_results WHERE image_url IS NULL ORDER BY food_code');
 return rows.map((r) => ({foodCode: r.food_code, targetName: r.target_name}));
}

// Removes any stored recipe whose food_code is no longer in the current eligible set (see
// generateAllEligibleRecipes) — a dish can drop out of eligibility later (a source nutrient goes
// missing, a naming rule tightens), and its old row would otherwise sit untouched forever, still
// serving whatever recipe was generated under the rules in effect at the time.
export async function deleteRecipeOptimizerResultsNotIn(foodCodes: string[]): Promise<number> {
 // 확장으로 추가한 메뉴(source가 optimizer가 아닌 행)는 이 규칙과 무관하므로 지우지 않는다.
 const {rowCount} = await getPool().query("DELETE FROM recipe_optimizer_results WHERE source = 'optimizer' AND NOT (food_code = ANY($1::text[]))", [foodCodes]);
 return rowCount ?? 0;
}

// Looks up a govDB recipe's real dish name by food_code, so the recipe-videos API can build a
// trustworthy search query for a `recipe-opt-{foodCode}` product id without taking an arbitrary
// client-supplied name (that would defeat the point of bounding YouTube search-quota use to real dishes).
export async function getRecipeOptimizerTargetName(foodCode: string): Promise<string | null> {
 const {rows} = await getPool().query('SELECT target_name FROM recipe_optimizer_results WHERE food_code = $1', [foodCode]);
 return rows[0]?.target_name ?? null;
}
