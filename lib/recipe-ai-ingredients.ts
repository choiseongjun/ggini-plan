import {nutritionAIConfig, NutritionAIError} from './nutrition-ai';

// The deterministic optimizer (lib/recipe-optimizer.ts) is constrained to ~26 generic raw ingredients
// and has no notion of what a NAMED dish specifically needs — a meatball needs egg/breadcrumbs as a
// binder, fried chicken needs salt/batter, and nothing in that palette represents them, so it just
// picks whatever combination of pork/tofu/onion/soy-sauce hits the calorie/protein target. This asks
// GPT to compose a realistic ingredient list instead, prioritizing "what would a home cook actually
// use" over exact numerical nutrition matching. Each ingredient's own nutrition/price is also the
// model's estimate — there is no real product or lab measurement behind any of it, same as the
// deterministic path, just estimated by a different method.
export type AiIngredient = {
 name: string; grams: number;
 caloriesKcal: number; proteinG: number; fatG: number; carbohydratesG: number; sugarG: number; sodiumMg: number;
 packGrams: number; packPriceWon: number;
};

const schema = {
 type: 'object', additionalProperties: false,
 properties: {
  ingredients: {
   type: 'array', minItems: 2, maxItems: 8,
   items: {
    type: 'object', additionalProperties: false,
    properties: {
     name: {type: 'string'}, grams: {type: 'number'},
     caloriesKcal: {type: 'number'}, proteinG: {type: 'number'}, fatG: {type: 'number'}, carbohydratesG: {type: 'number'}, sugarG: {type: 'number'}, sodiumMg: {type: 'number'},
     packGrams: {type: 'number'}, packPriceWon: {type: 'number'},
    },
    required: ['name', 'grams', 'caloriesKcal', 'proteinG', 'fatG', 'carbohydratesG', 'sugarG', 'sodiumMg', 'packGrams', 'packPriceWon'],
   },
  },
  note: {type: 'string'},
 },
 required: ['ingredients', 'note'],
};

const instructions = `You compose a REALISTIC home-cook ingredient list for a named Korean dish, for ONE SERVING (a realistic portion, already scaled — not a 100g reference amount).
Use 2-8 SPECIFIC, ordinary Korean grocery ingredients a home cook would actually buy and use to make THIS EXACT dish — not a generic substitute from an unrelated fixed list. Include binders/batter/seasoning the real dish structurally needs (e.g. a meatball needs egg and breadcrumbs; fried chicken needs salt and frying batter; a stew needs its actual seasoning paste), not just its main protein.
grams is the amount of that ingredient used in this one serving.
For each ingredient also give your own best-estimate standard nutrition per 100g of that ingredient as commonly sold/prepared (caloriesKcal, proteinG, fatG, carbohydratesG, sugarG, sodiumMg — sodiumMg matters a lot for salty/fried/seasoned dishes, do not default it to near-zero), and a realistic Korean grocery retail pack size in grams (packGrams) and typical price in Korean won (packPriceWon) for that whole pack (e.g. a bag of onions, a tray of eggs, a small bottle of ketchup) — not the price of just the grams used.
The combined nutrition of your list should land in the same rough neighborhood as the given target, but prioritize a realistic, recognizable version of the dish over forcing an exact numeric match — do not distort quantities into an unrealistic dish just to hit the target precisely.
These are all your own estimates, not manufacturer or lab data, and this is not the dish's official/traditional recipe — just a plausible approximation for nutrition/shopping estimation. note (Korean, under 200 characters): briefly describe the composition and flag anything you're unsure about.`;

export async function synthesizeRealisticIngredients(
 dish: {name: string; servingGrams: number; target: {kcal: number; protein: number; fat: number; carbohydrate: number; sugar: number; sodium: number}},
 fetcher: typeof fetch = fetch,
): Promise<{ingredients: AiIngredient[]; note: string}> {
 const {configured, model} = nutritionAIConfig();
 if (!configured) throw new NutritionAIError('OPENAI_API_KEY를 서버 환경변수에 설정해 주세요.');
 const t = dish.target;
 const prompt = `요리명: ${dish.name}
1인분(약 ${dish.servingGrams}g) 목표 영양: 열량 ${Math.round(t.kcal)}kcal, 단백질 ${t.protein.toFixed(1)}g, 지방 ${t.fat.toFixed(1)}g, 탄수화물 ${t.carbohydrate.toFixed(1)}g, 당류 ${t.sugar.toFixed(1)}g, 나트륨 ${Math.round(t.sodium)}mg`;
 let response: Response;
 // A batch of 600+ back-to-back calls can trip OpenAI's per-minute rate limit well before any spend
 // cap — retrying a 429 with a short backoff clears most of these without needing a whole separate
 // re-run pass (289/623 failed this way on the first unthrottled attempt).
 for (let attempt = 1; ; attempt++) {
  try {
   response = await fetcher('https://api.openai.com/v1/responses', {
    method: 'POST', headers: {Authorization: `Bearer ${process.env.OPENAI_API_KEY!.trim()}`, 'Content-Type': 'application/json'},
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({model, store: false, instructions, input: [{role: 'user', content: prompt}], max_output_tokens: 1500, text: {format: {type: 'json_schema', name: 'realistic_ingredients', strict: true, schema}}}),
   });
  } catch { throw new NutritionAIError('GPT 연결 또는 응답 시간이 초과됐습니다. 잠시 후 다시 시도해 주세요.'); }
  if (response.status === 429 && attempt < 5) { await new Promise((r) => setTimeout(r, attempt * 3000)); continue; }
  break;
 }
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
 const v = value as {ingredients?: unknown; note?: unknown};
 if (!Array.isArray(v.ingredients) || typeof v.note !== 'string') throw new NutritionAIError('GPT 응답 형식을 확인하지 못했습니다.');
 const isFiniteNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
 const ingredients: AiIngredient[] = v.ingredients.filter((i): i is AiIngredient => {
  if (!i || typeof i !== 'object') return false;
  const r = i as Record<string, unknown>;
  return typeof r.name === 'string' && r.name.trim().length > 0 &&
   isFiniteNumber(r.grams) && r.grams > 0 && r.grams <= 2000 &&
   isFiniteNumber(r.caloriesKcal) && r.caloriesKcal >= 0 &&
   isFiniteNumber(r.proteinG) && r.proteinG >= 0 &&
   isFiniteNumber(r.fatG) && r.fatG >= 0 &&
   isFiniteNumber(r.carbohydratesG) && r.carbohydratesG >= 0 &&
   isFiniteNumber(r.sugarG) && r.sugarG >= 0 &&
   isFiniteNumber(r.sodiumMg) && r.sodiumMg >= 0 &&
   isFiniteNumber(r.packGrams) && r.packGrams > 0 &&
   isFiniteNumber(r.packPriceWon) && r.packPriceWon > 0;
 }).map((i) => ({...i, name: i.name.trim().slice(0, 60), grams: Math.round(i.grams), packGrams: Math.round(i.packGrams), packPriceWon: Math.round(i.packPriceWon)}));
 if (!ingredients.length) throw new NutritionAIError('GPT가 유효한 재료 목록을 만들지 못했습니다.');
 return {ingredients, note: v.note.slice(0, 200)};
}
