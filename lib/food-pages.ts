import {getPool} from './db';
import {foodReferenceFromRow, type FoodReference} from './food-reference';
import {cache} from 'react';
import {unstable_cache} from 'next/cache';

// 음식 영양 검색 페이지(/kcal/[slug]) 데이터. 기준: 식약처 1일 영양성분 기준치(식품 표시 기준).
export const DAILY_VALUE = {kcal: 2000, carbs: 324, sugar: 100, protein: 55, fat: 54, sodium: 2000};
// 다른 음식 페이지에서 권하지 않는 음식(비슷한 음식·가벼운 메뉴·비교 후보). 해당 음식 페이지 자체는 그대로 둔다.
const NOT_SUGGESTED = ['보신탕', '영양탕', '개장국', '사철탕'];
export const foodPagePath = (slug: string) => `/kcal/${encodeURIComponent(slug)}`;

const COLUMNS = 'r.food_code,r.name,r.brand,r.category,r.basis_amount,r.basis_unit,r.serving_amount,r.serving_unit,r.calories_kcal,r.protein_g,r.carbohydrates_g,r.sugar_g,r.fat_g,r.sodium_mg';
export type RelatedFood = {slug: string; name: string; brand: string | null; kcal: number | null};

// Public reference data only. React cache also deduplicates metadata/page reads.
export const getFoodPage = cache(unstable_cache(loadFoodPage, ['food-page-v1'], {revalidate: 86400, tags: ['food-reference']}));
async function loadFoodPage(slug: string): Promise<{food: FoodReference; slug: string; related: RelatedFood[]; sameBrand: RelatedFood[]; lighter: RelatedFood[]} | null> {
 const db = getPool();
 const row = (await db.query(`SELECT p.slug, ${COLUMNS} FROM food_pages p JOIN food_reference r ON r.food_code = p.food_code WHERE p.slug = $1`, [slug])).rows[0];
 if (!row) return null;
 const food = foodReferenceFromRow(row);
 const first = food.name.split(' ')[0];
 const [related, sameBrand, lighter] = await Promise.all([
  // 같은 분류에서 이름이 비슷한 것 먼저, 그다음 칼로리가 비슷한 것.
  db.query<RelatedFood>(`SELECT slug, name, brand, kcal::float8 AS kcal FROM food_pages WHERE category IS NOT DISTINCT FROM $1 AND slug <> $2 AND brand IS NULL AND NOT (name = ANY($5))
   ORDER BY (name LIKE $3 || '%') DESC, abs(coalesce(kcal, 0) - $4) LIMIT 12`, [food.category, slug, first, food.kcal ?? 0, NOT_SUGGESTED]).then((r) => r.rows),
  food.brand ? db.query<RelatedFood>(`SELECT slug, name, brand, kcal::float8 AS kcal FROM food_pages WHERE brand = $1 AND slug <> $2 ORDER BY (name LIKE $3 || '%') DESC, name LIMIT 12`, [food.brand, slug, first]).then((r) => r.rows) : Promise.resolve([]),
  // 같은 분류의 일반 음식 중 15% 이상 가벼운 것 — "이것 대신 먹을 만한" 선택지.
  food.kcal !== null && food.category ? db.query<RelatedFood>(`SELECT slug, name, brand, kcal::float8 AS kcal FROM food_pages WHERE category = $1 AND brand IS NULL AND slug <> $2 AND kcal IS NOT NULL AND kcal <= $3 * 0.85 AND NOT (name = ANY($4))
   ORDER BY kcal DESC LIMIT 6`, [food.category, slug, food.kcal, NOT_SUGGESTED]).then((r) => r.rows) : Promise.resolve([] as RelatedFood[]),
 ]);
 return {food, slug, related, sameBrand, lighter};
}

// 색인 페이지: 많이 찾는 음식(이름이 정확히 같은 일반 음식이 있을 때만).
const POPULAR = ['순대국밥', '김치찌개', '된장찌개', '제육덮밥', '비빔밥', '짜장면', '짬뽕', '탕수육', '떡볶이', '김밥', '라면', '돈가스', '치킨', '삼겹살구이', '부대찌개', '냉면', '칼국수', '갈비탕', '육개장', '카레라이스', '오므라이스', '초밥', '우동', '카페라떼', '아메리카노', '치즈 케이크', '샐러드', '햄버거', '피자', '닭가슴살'];
export async function popularFoods(): Promise<RelatedFood[]> {
 const {rows} = await getPool().query<RelatedFood>('SELECT slug, name, brand, kcal::float8 AS kcal FROM food_pages WHERE brand IS NULL AND name = ANY($1)', [POPULAR]);
 return POPULAR.flatMap((n) => rows.filter((r) => r.name === n).slice(0, 1));
}

export async function searchFoodPages(q: string): Promise<RelatedFood[]> {
 const key = q.trim().replace(/\s+/g, '');
 if (!key) return [];
 const {rows} = await getPool().query<RelatedFood>(`SELECT slug, name, brand, kcal::float8 AS kcal FROM food_pages WHERE replace(name, ' ', '') LIKE '%' || $1 || '%' OR replace(coalesce(brand, ''), ' ', '') LIKE '%' || $1 || '%'
  ORDER BY (replace(name, ' ', '') = $1) DESC, (brand IS NULL) DESC, length(name) LIMIT 60`, [key]);
 return rows;
}

export const foodPageSlugs = unstable_cache(async (): Promise<string[]> => {
 return (await getPool().query<{slug: string}>('SELECT slug FROM food_pages ORDER BY (brand IS NULL) DESC, slug')).rows.map((r) => r.slug);
}, ['food-page-slugs-v1'], {revalidate: 86400, tags: ['food-reference']});

// ── 음식 비교(/kcal/vs/A-vs-B) ─────────────────────────────────────────────
// "김치찌개 vs 된장찌개 칼로리"처럼 실제로 많이 찾는 비교를 같은 분류의 일반 음식끼리 만든다.
const VS = '-vs-';
export const comparePath = (a: string, b: string) => {
 const [x, y] = [a, b].sort((p, q) => p.localeCompare(q, 'ko'));
 return `/kcal/vs/${encodeURIComponent(`${x}${VS}${y}`)}`;
};
export function parseComparePair(pair: string): [string, string] | null {
 const parts = pair.split(VS);
 return parts.length === 2 && parts[0] && parts[1] && parts[0] !== parts[1] ? [parts[0], parts[1]] : null;
}
export async function getFoodsBySlugs(slugs: string[]): Promise<{slug: string; food: FoodReference}[]> {
 const {rows} = await getPool().query(`SELECT p.slug, ${COLUMNS} FROM food_pages p JOIN food_reference r ON r.food_code = p.food_code WHERE p.slug = ANY($1::text[])`, [slugs]);
 return slugs.flatMap((slug) => { const row = rows.find((r) => r.slug === slug); return row ? [{slug, food: foodReferenceFromRow(row)}] : []; });
}
/** 이 음식과 비교할 만한 같은 분류의 일반 음식(칼로리가 가까운 순, 한 단어 이름만). */
// 1인분 단위가 같고 양이 0.67~1.5배 안인 음식끼리만 비교한다(400g 찌개 vs 100mL 전골 같은 오해 방지).
const SAME_SERVING = `rq.serving_unit IS NOT DISTINCT FROM rp.serving_unit AND rq.serving_amount BETWEEN rp.serving_amount / 1.5 AND rp.serving_amount * 1.5`;
export async function compareCandidates(slug: string, category: string | null, kcal: number | null, limit = 4): Promise<RelatedFood[]> {
 if (!category || kcal === null) return [];
 const {rows} = await getPool().query<RelatedFood>(`SELECT q.slug, q.name, q.brand, q.kcal::float8 AS kcal FROM food_pages p JOIN food_reference rp ON rp.food_code = p.food_code
  JOIN food_pages q ON q.category = p.category JOIN food_reference rq ON rq.food_code = q.food_code
  WHERE p.slug = $2 AND q.category = $1 AND q.brand IS NULL AND q.slug <> p.slug AND q.kcal IS NOT NULL AND strpos(q.name, ' ') = 0 AND NOT (q.name = ANY($5)) AND ${SAME_SERVING}
  ORDER BY abs(q.kcal - $3) LIMIT $4`, [category, slug, kcal, limit, NOT_SUGGESTED]);
 return rows;
}
/** 사이트맵용: 많이 찾는 음식마다 같은 분류의 가까운 음식 3개와 비교. */
export async function popularComparePaths(): Promise<string[]> {
 const {rows} = await getPool().query<{a: string; b: string}>(`SELECT p.slug AS a, c.slug AS b FROM food_pages p JOIN food_reference rp ON rp.food_code = p.food_code
  CROSS JOIN LATERAL (SELECT q.slug FROM food_pages q JOIN food_reference rq ON rq.food_code = q.food_code WHERE q.category = p.category AND q.brand IS NULL AND q.slug <> p.slug AND q.kcal IS NOT NULL AND strpos(q.name, ' ') = 0 AND NOT (q.name = ANY($2)) AND ${SAME_SERVING} ORDER BY abs(q.kcal - p.kcal) LIMIT 3) c
  WHERE p.brand IS NULL AND p.name = ANY($1) AND p.kcal IS NOT NULL`, [POPULAR, NOT_SUGGESTED]);
 return [...new Set(rows.map((r) => comparePath(r.a, r.b)))];
}
