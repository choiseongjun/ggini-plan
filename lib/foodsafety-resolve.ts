import {getPool} from './db';
import type {CatalogItem} from './catalog';
import type {PlanProduct} from './shopping-plan';

export async function similarCatalogProducts(dishNames: string[], excludeId: string | null, limit = 6): Promise<{id: string; name: string; price: number; productUrl: string | null; productImageUrl: string | null}[]> {
 const cleaned = [...new Set(dishNames.map(cleanDishName).filter(Boolean))];
 if (!cleaned.length) return [];
 const conditions = cleaned.map((_, i) => `name ILIKE '%'||$${i + 1}||'%'`).join(' OR ');
 const params: unknown[] = [...cleaned];
 let excludeClause = '';
 if (excludeId) { params.push(excludeId); excludeClause = `AND id<>$${params.length}`; }
 params.push(limit);
 const {rows} = await getPool().query(
  `SELECT id,name,price,product_url,product_image_url FROM catalog_items WHERE (${conditions}) AND price>0 AND product_url IS NOT NULL ${excludeClause} ORDER BY price ASC LIMIT $${params.length}`,
  params,
 );
 return rows.map((r) => ({id: r.id, name: r.name, price: Number(r.price), productUrl: r.product_url, productImageUrl: r.product_image_url}));
}

// A cooked-dish row from the government nutrition snapshot (foodsafety_nutrition_canonical),
// trimmed to what candidate-resolution needs. No price/productUrl exist on this data on purpose:
// a government dish can only ever point at a real catalog product, never stand in for one itself.
export type GovDish = {
 foodCode: string; itemName: string; representativeName: string; datasetLabel: string; basisAmount: string;
 caloriesKcal: number | null; proteinG: number | null; fatG: number | null; carbohydratesG: number | null; sugarG: number | null; sodiumMg: number | null;
};

// Strips marketing punctuation/digits so "[국내산] 소불고기 250g" and "소불고기" can line up
// against the government DB's plainer naming. Intentionally exact-match only for now (v1):
// fuzzy substring matching against ~2,000 catalog names x ~12,000 dish names is where false
// positives (e.g. matching an unrelated dish that shares a common word) would creep in.
export const cleanDishName = (s: string) => s
 .replace(/\[[^\]]*\]|\([^)]*\)|【[^】]*】/g, ' ') // brand/package-size prefixes like "[하남돼지집]" carry no dish-name signal
 .replace(/[·,.\-–_\/%0-9]+/g, ' ')
 .replace(/\s+/g, ' ').trim();

export async function getCookedDish(foodCode: string): Promise<GovDish | null> {
 const {rows} = await getPool().query(
  `SELECT food_code,item_name,representative_name,dataset_label,basis_amount,calories_kcal,protein_g,fat_g,carbohydrates_g,sugar_g,sodium_mg
   FROM foodsafety_nutrition_canonical WHERE food_code=$1`,
  [foodCode],
 );
 const r = rows[0];
 if (!r) return null;
 return {
  foodCode: r.food_code, itemName: r.item_name, representativeName: r.representative_name, datasetLabel: r.dataset_label, basisAmount: r.basis_amount,
  caloriesKcal: r.calories_kcal === null ? null : Number(r.calories_kcal),
  proteinG: r.protein_g === null ? null : Number(r.protein_g),
  fatG: r.fat_g === null ? null : Number(r.fat_g),
  carbohydratesG: r.carbohydrates_g === null ? null : Number(r.carbohydrates_g),
  sugarG: r.sugar_g === null ? null : Number(r.sugar_g),
  sodiumMg: r.sodium_mg === null ? null : Number(r.sodium_mg),
 };
}

export async function fetchCookedDishes({includeVolumeBasis = false}: {includeVolumeBasis?: boolean} = {}): Promise<GovDish[]> {
 // g-basis by default: ml-basis rows measure a different physical quantity (volume, not mass) and this
 // codebase refuses to convert between them for products (see lib/serving-nutrients.ts).
 // The recipe generator opts into 100mL rows as an approximation (cooked dishes ≈ 1 g/mL): about half of
 // the government 음식 DB — including plain solid dishes like 가자미구이 — is only published per 100mL.
 // A dish that also has a 100g row always uses that one.
 const {rows} = await getPool().query(
  `SELECT food_code,item_name,representative_name,dataset_label,basis_amount,calories_kcal,protein_g,fat_g,carbohydrates_g,sugar_g,sodium_mg
   FROM foodsafety_nutrition_canonical WHERE dataset_label='음식' AND basis_amount = ANY($1)
   ORDER BY item_name, (basis_amount='100g') DESC`,
  [includeVolumeBasis ? ['100g', '100mL'] : ['100g']],
 );
 const seen = new Set<string>();
 return rows.filter((r) => !seen.has(r.item_name) && seen.add(r.item_name)).map((r) => ({
  foodCode: r.food_code, itemName: r.item_name, representativeName: r.representative_name, datasetLabel: r.dataset_label, basisAmount: r.basis_amount,
  caloriesKcal: r.calories_kcal === null ? null : Number(r.calories_kcal),
  proteinG: r.protein_g === null ? null : Number(r.protein_g),
  fatG: r.fat_g === null ? null : Number(r.fat_g),
  carbohydratesG: r.carbohydrates_g === null ? null : Number(r.carbohydrates_g),
  sugarG: r.sugar_g === null ? null : Number(r.sugar_g),
  sodiumMg: r.sodium_mg === null ? null : Number(r.sodium_mg),
 }));
}

export function buildDishNameIndex(dishes: GovDish[]): Map<string, GovDish> {
 const index = new Map<string, GovDish>();
 for (const dish of dishes) {
  for (const name of [dish.itemName, dish.representativeName]) {
   const key = cleanDishName(name);
   if (key && !index.has(key)) index.set(key, dish);
  }
 }
 return index;
}

// A real product can only stand in as "a serving" once we know how much of it that is.
// Reuses the same explicit-hint heuristic lib/shopping-plan-catalog.ts already applies to
// un-curated catalog rows, plus a single-count-unit shortcut ('개' x1 is unambiguously "one").
function estimateServings(item: CatalogItem): {servings: number; servingNote: string} | null {
 if (item.unit === '개' && item.quantity === 1) return {servings: 1, servingNote: '판매 1개 기준 · 정부DB 매칭 자동 추정'};
 const text = `${item.name} ${item.detail}`;
 const explicit = text.match(/(\d+)\s*인분/) ?? text.match(/(\d+)\s*개입/);
 if (explicit) {
  const n = Number(explicit[1]);
  if (n >= 1 && n <= 10) return {servings: n, servingNote: `판매 구성 ${n}인분/개입 기준 · 정부DB 매칭 자동 추정`};
 }
 return null;
}

// Resolves ONE catalog row into a plan-ready candidate if (a) it isn't already in the pool,
// (b) it's a real purchasable item, (c) its name lines up with a government dish, and
// (d) a serving size can be honestly derived. No step here ever fabricates a price.
export function resolveDishCandidate(item: CatalogItem, dishByName: Map<string, GovDish>, existingIds: Set<string>): PlanProduct | null {
 if (existingIds.has(item.id) || !item.productUrl || item.price <= 0) return null;
 if (!dishByName.has(cleanDishName(item.name))) return null;
 const serving = estimateServings(item);
 if (!serving) return null;
 return {
  ...item, servings: serving.servings, servingNote: serving.servingNote,
  avoidanceText: item.allergyInfo?.status === 'unknown' || !item.allergyInfo ? null : `${item.name} ${item.allergyInfo.statement}`,
 };
}

// New candidate source for lib/shopping-plan-catalog.ts's planProducts(): widens the pool
// using the ~16,900-dish government reference as a name vocabulary, instead of only the
// hand-curated manifests + 20 hand-authored recipes. `existingPool` is whatever planProducts()
// already assembled from those existing sources, so this only ever adds genuinely new entries.
export async function governmentDishCandidates(catalog: CatalogItem[], existingPool: PlanProduct[]): Promise<{candidates: PlanProduct[]; resolved: number; total: number}> {
 const dishes = await fetchCookedDishes();
 const index = buildDishNameIndex(dishes);
 const existingIds = new Set(existingPool.map((p) => p.id));
 const candidates: PlanProduct[] = [];
 for (const item of catalog) {
  const candidate = resolveDishCandidate(item, index, existingIds);
  if (candidate) { candidates.push(candidate); existingIds.add(candidate.id); }
 }
 return {candidates, resolved: candidates.length, total: dishes.length};
}
