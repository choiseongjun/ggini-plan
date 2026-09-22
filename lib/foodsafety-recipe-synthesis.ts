import {getPool} from './db';
import {ingredientRoles, type IngredientRole} from './cooking-ingredient-pool';
import {nutritionAIConfig, NutritionAIError} from './nutrition-ai';
import type {GovDish} from './foodsafety-resolve';

const roleKeys = Object.keys(ingredientRoles) as IngredientRole[];

export type SynthesizedIngredient = {role: IngredientRole; grams: number};
export type SynthesizedRecipe = {
 foodCode: string; dishName: string; roles: SynthesizedIngredient[];
 confidence: 'high' | 'medium' | 'low'; note: string; status: 'draft' | 'approved';
};

const schema = {
 type: 'object', additionalProperties: false,
 properties: {
  ingredients: {
   type: 'array', minItems: 1, maxItems: 5,
   items: {
    type: 'object', additionalProperties: false,
    properties: {role: {type: 'string', enum: roleKeys}, grams: {type: 'number'}},
    required: ['role', 'grams'],
   },
  },
  confidence: {type: 'string', enum: ['high', 'medium', 'low']},
  note: {type: 'string'},
 },
 required: ['ingredients', 'confidence', 'note'],
};

const roleDescriptions = Object.entries(ingredientRoles).map(([key, label]) => `${key}: ${label}`).join('\n');

const instructions = `You compose a plausible home-cook ingredient list for a named Korean dish, from a FIXED vocabulary of ingredient roles only. You never invent a role outside this list:
${roleDescriptions}

Given a dish name and its known nutrition (per 100g/100ml, from a government food database), pick 1-5 roles from the list above whose typical combined nutrition per one serving would roughly resemble that dish's profile (protein-heavy dish -> a protein role with realistic grams; a rice-based dish -> include 'rice'). Grams are for ONE realistic serving of that role in the finished dish, not the whole package.
If no combination of the listed roles can reasonably represent this dish (e.g., a beverage, dessert, or dish needing seasonings/vegetables entirely outside the list), return an empty ingredients array and confidence "low", explaining why in note (Korean).
Set confidence "high" only when the dish is a simple, direct match to available roles (e.g. "제육볶음" -> pork). Use "medium" for a reasonable but approximate stand-in, "low" for a rough guess.
Never claim this is the dish's real/traditional recipe. Note (Korean, under 200 characters) must say this is an AI-composed approximation for shopping/nutrition estimation, not an authentic recipe.`;

export async function synthesizeRecipeIngredients(dish: GovDish, fetcher: typeof fetch = fetch): Promise<Omit<SynthesizedRecipe, 'status'>> {
 const {configured, model} = nutritionAIConfig();
 if (!configured) throw new NutritionAIError('OPENAI_API_KEY를 서버 환경변수에 설정해 주세요.');
 const prompt = `요리명: ${dish.itemName} (대표명: ${dish.representativeName})
100g/100ml 기준 영양 (정부 식품영양성분DB): 열량 ${dish.caloriesKcal ?? '미확인'}kcal, 단백질 ${dish.proteinG ?? '미확인'}g, 지방 ${dish.fatG ?? '미확인'}g, 탄수화물 ${dish.carbohydratesG ?? '미확인'}g, 나트륨 ${dish.sodiumMg ?? '미확인'}mg`;
 let response: Response;
 try {
  response = await fetcher('https://api.openai.com/v1/responses', {
   method: 'POST', headers: {Authorization: `Bearer ${process.env.OPENAI_API_KEY!.trim()}`, 'Content-Type': 'application/json'},
   signal: AbortSignal.timeout(30000),
   body: JSON.stringify({model, store: false, instructions, input: [{role: 'user', content: prompt}], max_output_tokens: 1200, text: {format: {type: 'json_schema', name: 'recipe_synthesis', strict: true, schema}}}),
  });
 } catch { throw new NutritionAIError('GPT 연결 또는 응답 시간이 초과됐습니다. 잠시 후 다시 시도해 주세요.'); }
 if (!response.ok) {
  if (response.status === 401 || response.status === 403) throw new NutritionAIError('OpenAI API 키 또는 모델 접근 권한을 확인해 주세요.');
  if (response.status === 429) throw new NutritionAIError('OpenAI 사용 한도 또는 요청 제한에 도달했습니다.');
  throw new NutritionAIError('OpenAI 서비스 응답 오류입니다. 잠시 후 다시 시도해 주세요.');
 }
 let data: {status?: string; output?: {type?: string; content?: {type: string; text?: string}[]}[]};
 try { data = await response.json(); } catch { throw new NutritionAIError('GPT 응답 형식을 확인하지 못했습니다.'); }
 if (data.status !== 'completed' || !Array.isArray(data.output)) throw new NutritionAIError('GPT 응답이 완료되지 않았습니다.');
 const parts = data.output.filter((v) => v.type === 'message').flatMap((v) => v.content ?? []);
 const raw = parts.filter((v) => v.type === 'output_text').map((v) => v.text ?? '').join('');
 let value: unknown;
 try { value = JSON.parse(raw); } catch { throw new NutritionAIError('GPT 응답을 읽지 못했습니다.'); }
 const v = value as {ingredients?: unknown; confidence?: unknown; note?: unknown};
 if (!Array.isArray(v.ingredients) || !['high', 'medium', 'low'].includes(String(v.confidence)) || typeof v.note !== 'string') throw new NutritionAIError('GPT 응답 형식을 확인하지 못했습니다.');
 const roles: SynthesizedIngredient[] = v.ingredients
  .filter((i): i is {role: string; grams: number} => Boolean(i) && typeof i === 'object' && typeof (i as {role?: unknown}).role === 'string' && (roleKeys as string[]).includes((i as {role: string}).role) && typeof (i as {grams?: unknown}).grams === 'number' && (i as {grams: number}).grams > 0 && (i as {grams: number}).grams <= 2000)
  .map((i) => ({role: i.role as IngredientRole, grams: Math.round(i.grams)}));
 return {foodCode: dish.foodCode, dishName: dish.itemName, roles, confidence: v.confidence as SynthesizedRecipe['confidence'], note: v.note.slice(0, 200)};
}

export async function saveSynthesizedDraft(recipe: Omit<SynthesizedRecipe, 'status'>) {
 await getPool().query(
  `INSERT INTO foodsafety_synthesized_recipes (food_code, dish_name, roles, confidence, note, status)
   VALUES ($1,$2,$3::jsonb,$4,$5,'draft')
   ON CONFLICT (food_code) DO UPDATE SET dish_name=$2, roles=$3::jsonb, confidence=$4, note=$5, status='draft', approved_at=NULL, approved_by=NULL`,
  [recipe.foodCode, recipe.dishName, JSON.stringify(recipe.roles), recipe.confidence, recipe.note],
 );
}

export async function approveSynthesizedRecipe(foodCode: string, roles: SynthesizedIngredient[], userId: string) {
 await getPool().query(
  `UPDATE foodsafety_synthesized_recipes SET roles=$2::jsonb, status='approved', approved_at=NOW(), approved_by=$3 WHERE food_code=$1`,
  [foodCode, JSON.stringify(roles), userId],
 );
}

export async function listSynthesizedRecipes(status?: 'draft' | 'approved'): Promise<SynthesizedRecipe[]> {
 const {rows} = await getPool().query(
  status ? `SELECT * FROM foodsafety_synthesized_recipes WHERE status=$1 ORDER BY created_at DESC` : `SELECT * FROM foodsafety_synthesized_recipes ORDER BY created_at DESC`,
  status ? [status] : [],
 );
 return rows.map((r) => ({foodCode: r.food_code, dishName: r.dish_name, roles: r.roles, confidence: r.confidence, note: r.note ?? '', status: r.status}));
}

export async function approvedRecipeTemplates(): Promise<{id: string; name: string; roles: SynthesizedIngredient[]}[]> {
 const recipes = await listSynthesizedRecipes('approved');
 return recipes.filter((r) => r.roles.length).map((r) => ({id: `govdb-${r.foodCode}`, name: r.dishName, roles: r.roles}));
}
