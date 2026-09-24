import {getPool} from './db';
import {foodReferenceFromRow, type FoodReference} from './food-reference';

// 음식 영양 검색 페이지(/kcal/[slug]) 데이터. 기준: 식약처 1일 영양성분 기준치(식품 표시 기준).
export const DAILY_VALUE = {kcal: 2000, carbs: 324, sugar: 100, protein: 55, fat: 54, sodium: 2000};
export const foodPagePath = (slug: string) => `/kcal/${encodeURIComponent(slug)}`;

const COLUMNS = 'r.food_code,r.name,r.brand,r.category,r.basis_amount,r.basis_unit,r.serving_amount,r.serving_unit,r.calories_kcal,r.protein_g,r.carbohydrates_g,r.sugar_g,r.fat_g,r.sodium_mg';
export type RelatedFood = {slug: string; name: string; brand: string | null; kcal: number | null};

export async function getFoodPage(slug: string): Promise<{food: FoodReference; slug: string; related: RelatedFood[]; sameBrand: RelatedFood[]} | null> {
 const db = getPool();
 const row = (await db.query(`SELECT p.slug, ${COLUMNS} FROM food_pages p JOIN food_reference r ON r.food_code = p.food_code WHERE p.slug = $1`, [slug])).rows[0];
 if (!row) return null;
 const food = foodReferenceFromRow(row);
 const first = food.name.split(' ')[0];
 const [related, sameBrand] = await Promise.all([
  // 같은 분류에서 이름이 비슷한 것 먼저, 그다음 칼로리가 비슷한 것.
  db.query<RelatedFood>(`SELECT slug, name, brand, kcal::float8 AS kcal FROM food_pages WHERE category IS NOT DISTINCT FROM $1 AND slug <> $2 AND brand IS NULL
   ORDER BY (name LIKE $3 || '%') DESC, abs(coalesce(kcal, 0) - $4) LIMIT 12`, [food.category, slug, first, food.kcal ?? 0]).then((r) => r.rows),
  food.brand ? db.query<RelatedFood>(`SELECT slug, name, brand, kcal::float8 AS kcal FROM food_pages WHERE brand = $1 AND slug <> $2 ORDER BY (name LIKE $3 || '%') DESC, name LIMIT 12`, [food.brand, slug, first]).then((r) => r.rows) : Promise.resolve([]),
 ]);
 return {food, slug, related, sameBrand};
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

export async function foodPageSlugs(): Promise<string[]> {
 return (await getPool().query<{slug: string}>('SELECT slug FROM food_pages ORDER BY (brand IS NULL) DESC, slug')).rows.map((r) => r.slug);
}
