import {getPool} from './db';
import type {GeneratedRecipe} from './recipe-optimizer';

export type StoredRecipeResult = GeneratedRecipe & {foodCode: string; createdAt: string; imageUrl: string | null; imageUrls: string[] | null};

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
  score: Number(r.score), createdAt: r.created_at.toISOString(), imageUrl: r.image_url, imageUrls: r.image_urls,
 }));
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

// Looks up a govDB recipe's real dish name by food_code, so the recipe-videos API can build a
// trustworthy search query for a `recipe-opt-{foodCode}` product id without taking an arbitrary
// client-supplied name (that would defeat the point of bounding YouTube search-quota use to real dishes).
export async function getRecipeOptimizerTargetName(foodCode: string): Promise<string | null> {
 const {rows} = await getPool().query('SELECT target_name FROM recipe_optimizer_results WHERE food_code = $1', [foodCode]);
 return rows[0]?.target_name ?? null;
}
