import {getPool} from './db';

export function foodSafetyConfigured() {
 return Boolean(process.env.FOODSAFETY_API_KEY?.trim());
}

export type FoodSafetyMatch = {
 foodCode: string; name: string; makerName: string; servingSize: string; servingUnit: string;
 caloriesKcal: number | null; carbohydratesG: number | null; proteinG: number | null; fatG: number | null; sodiumMg: number | null;
 datasetLabel?: string; sampleCount?: number;
};

export async function localFoodSafetyCount(): Promise<number> {
 const {rows} = await getPool().query('SELECT count(*)::int AS count FROM foodsafety_nutrition_canonical');
 return rows[0]?.count ?? 0;
}

export type FoodSafetyRow = {
 foodCode: string; itemName: string; representativeName: string; categoryLarge: string | null; datasetLabel: string;
 basisAmount: string; caloriesKcal: number | null; proteinG: number | null; fatG: number | null; carbohydratesG: number | null; sugarG: number | null; sodiumMg: number | null;
 sampleCount: number;
};

export async function listLocalFoodSafety({query, label, limit, offset}: {query: string; label: string; limit: number; offset: number}): Promise<{rows: FoodSafetyRow[]; total: number}> {
 const conditions: string[] = [];
 const params: unknown[] = [];
 if (query) { params.push(`%${query}%`); conditions.push(`(item_name ILIKE $${params.length} OR representative_name ILIKE $${params.length})`); }
 if (label && label !== 'all') { params.push(label); conditions.push(`dataset_label=$${params.length}`); }
 const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
 const listParams = [...params, limit, offset];
 const {rows} = await getPool().query(
  `SELECT food_code,item_name,representative_name,category_large,dataset_label,basis_amount,calories_kcal,protein_g,fat_g,carbohydrates_g,sugar_g,sodium_mg,sample_count
   FROM foodsafety_nutrition_canonical ${where} ORDER BY item_name LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
  listParams,
 );
 const {rows: countRows} = await getPool().query(`SELECT count(*)::int AS count FROM foodsafety_nutrition_canonical ${where}`, params);
 return {
  rows: rows.map((row) => ({
   foodCode: row.food_code, itemName: row.item_name, representativeName: row.representative_name,
   categoryLarge: row.category_large, datasetLabel: row.dataset_label, basisAmount: row.basis_amount,
   caloriesKcal: row.calories_kcal === null ? null : Number(row.calories_kcal),
   proteinG: row.protein_g === null ? null : Number(row.protein_g),
   fatG: row.fat_g === null ? null : Number(row.fat_g),
   carbohydratesG: row.carbohydrates_g === null ? null : Number(row.carbohydrates_g),
   sugarG: row.sugar_g === null ? null : Number(row.sugar_g),
   sodiumMg: row.sodium_mg === null ? null : Number(row.sodium_mg),
   sampleCount: Number(row.sample_count) || 1,
  })),
  total: countRows[0]?.count ?? 0,
 };
}

export async function searchLocalFoodSafety(keyword: string, limit: number): Promise<FoodSafetyMatch[]> {
 const safeLimit = Math.min(50, Math.max(1, limit));
 const {rows} = await getPool().query(
  `SELECT food_code,item_name,dataset_label,basis_amount,calories_kcal,protein_g,fat_g,carbohydrates_g,sodium_mg,sample_count
   FROM foodsafety_nutrition_canonical
   WHERE item_name ILIKE '%'||$1||'%' OR representative_name ILIKE '%'||$1||'%'
   ORDER BY (item_name ILIKE $1||'%') DESC, length(item_name) ASC
   LIMIT $2`,
  [keyword, safeLimit],
 );
 return rows.map((row) => ({
  foodCode: row.food_code, name: row.item_name, makerName: '', datasetLabel: row.dataset_label,
  servingSize: row.basis_amount ?? '', servingUnit: '', sampleCount: Number(row.sample_count) || 1,
  caloriesKcal: row.calories_kcal === null ? null : Number(row.calories_kcal),
  proteinG: row.protein_g === null ? null : Number(row.protein_g),
  fatG: row.fat_g === null ? null : Number(row.fat_g),
  carbohydratesG: row.carbohydrates_g === null ? null : Number(row.carbohydrates_g),
  sodiumMg: row.sodium_mg === null ? null : Number(row.sodium_mg),
 }));
}

export type SubstituteSort = 'similar' | 'sodium' | 'calories' | 'protein' | 'fat' | 'carbohydrates';
const sortField: Record<Exclude<SubstituteSort, 'similar'>, keyof FoodSafetyRow> = {
 sodium: 'sodiumMg', calories: 'caloriesKcal', protein: 'proteinG', fat: 'fatG', carbohydrates: 'carbohydratesG',
};
// Rough per-nutrient scale so no single dimension (sodium's mg range vs fat's g range) dominates the distance.
const nutrientScale = {caloriesKcal: 50, proteinG: 5, fatG: 5, carbohydratesG: 10, sodiumMg: 200} as const;

export async function findFoodSafetySubstitutes(foodCode: string, {sortBy = 'similar', limit = 8}: {sortBy?: SubstituteSort; limit?: number} = {}) {
 const {rows: sourceRows} = await getPool().query('SELECT * FROM foodsafety_nutrition_canonical WHERE food_code=$1', [foodCode]);
 const source = sourceRows[0];
 if (!source) return null;
 const safeLimit = Math.min(20, Math.max(1, limit));
 // Scoped to the same representative_name so "간장" only ever competes with other 간장 variants,
 // never with an unrelated dish that happens to land on similar calorie/sodium numbers (e.g. 간짜장).
 const {rows: candidates} = await getPool().query(
  'SELECT * FROM foodsafety_nutrition_canonical WHERE representative_name=$1 AND food_code<>$2',
  [source.representative_name, foodCode],
 );
 const toRow = (r: Record<string, unknown>): FoodSafetyRow => ({
  foodCode: String(r.food_code), itemName: String(r.item_name), representativeName: String(r.representative_name),
  categoryLarge: (r.category_large as string | null) ?? null, datasetLabel: String(r.dataset_label), basisAmount: String(r.basis_amount),
  caloriesKcal: r.calories_kcal === null ? null : Number(r.calories_kcal), proteinG: r.protein_g === null ? null : Number(r.protein_g),
  fatG: r.fat_g === null ? null : Number(r.fat_g), carbohydratesG: r.carbohydrates_g === null ? null : Number(r.carbohydrates_g),
  sugarG: r.sugar_g === null ? null : Number(r.sugar_g), sodiumMg: r.sodium_mg === null ? null : Number(r.sodium_mg),
  sampleCount: Number(r.sample_count) || 1,
 });
 const sourceRow = toRow(source);
 const distance = (a: FoodSafetyRow, b: FoodSafetyRow) => Math.sqrt((Object.keys(nutrientScale) as (keyof typeof nutrientScale)[])
  .reduce((sum, key) => sum + ((((a[key] ?? 0) - (b[key] ?? 0)) / nutrientScale[key]) ** 2), 0));
 const scored = candidates.map(toRow);
 if (sortBy === 'similar') scored.sort((a, b) => distance(a, sourceRow) - distance(b, sourceRow));
 else { const key = sortField[sortBy]; scored.sort((a, b) => (Number(a[key]) || Infinity) - (Number(b[key]) || Infinity)); }
 return {source: sourceRow, candidates: scored.slice(0, safeLimit)};
}

function toNumber(value: unknown): number | null {
 const n = Number(value);
 return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export async function searchFoodSafetyNutrition(keyword: string, limit: number): Promise<FoodSafetyMatch[]> {
 const key = process.env.FOODSAFETY_API_KEY?.trim();
 if (!key) throw new Error('식약처 식품영양성분DB API 키가 설정되지 않았어요.');
 const safeLimit = Math.min(50, Math.max(1, limit));
 const url = `http://openapi.foodsafetykorea.go.kr/api/${encodeURIComponent(key)}/I2790/json/1/${safeLimit}/DESC_KOR=${encodeURIComponent(keyword)}`;
 const response = await fetch(url, {cache: 'no-store', signal: AbortSignal.timeout(10000)});
 if (!response.ok) throw new Error(`식약처 API 응답 오류 (${response.status})`);
 const data = await response.json();
 const service = data?.I2790;
 const code = service?.RESULT?.CODE as string | undefined;
 if (code && code !== 'INFO-000') {
  if (code === 'INFO-200') return [];
  throw new Error(service?.RESULT?.MSG || '식약처 API 조회에 실패했어요.');
 }
 const rows: Record<string, unknown>[] = Array.isArray(service?.row) ? service.row : [];
 return rows
  .map((row) => ({
   foodCode: String(row.FOOD_CD ?? ''),
   name: String(row.DESC_KOR ?? '').trim(),
   makerName: String(row.MAKER_NAME ?? '').trim(),
   servingSize: String(row.SERVING_SIZE ?? '').trim(),
   servingUnit: String(row.SERVING_UNIT ?? '').trim(),
   caloriesKcal: toNumber(row.NUTR_CONT1),
   carbohydratesG: toNumber(row.NUTR_CONT2),
   proteinG: toNumber(row.NUTR_CONT3),
   fatG: toNumber(row.NUTR_CONT4),
   sodiumMg: toNumber(row.NUTR_CONT6),
  }))
  .filter((m) => m.foodCode && m.name);
}
