import {getPool} from './db';

// 음식 영양 사전(food_reference): 간식·디저트·음료·외식을 이름으로 찾아 1회 제공량 기준 영양을 알려 준다.
export type FoodReference = {
 code: string; name: string; brand: string | null; category: string | null;
 servingAmount: number; servingUnit: string;
 kcal: number | null; protein: number | null; carbs: number | null; sugar: number | null; fat: number | null; sodium: number | null;
};
export const REFERENCE_PREFIX = 'ref:';

type Row = {food_code: string; name: string; brand: string | null; category: string | null; basis_amount: string; basis_unit: string; serving_amount: string | null; serving_unit: string | null;
 calories_kcal: string | null; protein_g: string | null; carbohydrates_g: string | null; sugar_g: string | null; fat_g: string | null; sodium_mg: string | null};

// 영양값은 100g/100mL 기준 → 1회 제공량(없으면 기준량)으로 환산한다.
function toReference(r: Row): FoodReference {
 const basis = Number(r.basis_amount), serving = r.serving_amount === null ? basis : Number(r.serving_amount);
 const unit = r.serving_amount === null ? r.basis_unit : r.serving_unit ?? r.basis_unit;
 const scale = (v: string | null) => v === null ? null : Math.round(Number(v) * serving / basis * 10) / 10;
 return {
  code: r.food_code, name: r.name.replace(/_/g, ' '), brand: r.brand, category: r.category, servingAmount: serving, servingUnit: unit,
  kcal: scale(r.calories_kcal), protein: scale(r.protein_g), carbs: scale(r.carbohydrates_g), sugar: scale(r.sugar_g), fat: scale(r.fat_g), sodium: scale(r.sodium_mg),
 };
}
const COLUMNS = 'food_code,name,brand,category,basis_amount,basis_unit,serving_amount,serving_unit,calories_kcal,protein_g,carbohydrates_g,sugar_g,fat_g,sodium_mg';
export const normalizeFoodQuery = (text: string) => text.toLowerCase().replace(/[\s_()·,.\-\[\]]/g, '');

// 자주 쓰는 줄임말 → DB 이름.
const ALIASES: Record<string, string> = {'아아': '아이스 아메리카노', '뜨아': '아메리카노', '아바라': '바닐라 라떼', '아샷추': '샷 추가 아이스티', '카라멜마끼아또': '카라멜 마키아토', '마끼아또': '마키아토', '치맥': '치킨', '떡튀순': '떡볶이'};
export async function searchFoodReference(rawQuery: string, limit = 30): Promise<FoodReference[]> {
 const query = ALIASES[rawQuery.trim().replace(/\s+/g, '')] ?? rawQuery;
 const key = normalizeFoodQuery(query);
 if (!key) return [];
 const words = query.trim().split(/\s+/).map(normalizeFoodQuery).filter(Boolean).slice(0, 4);
 // 여러 단어("스타벅스 라떼")는 모두 포함해야 한다. 이름이 검색어로 시작·일치하는 것, 칼로리가 있는 것, 짧은 이름 순.
 const {rows} = await getPool().query<Row>(
  `SELECT DISTINCT ON (name, brand, serving_amount) ${COLUMNS}, length(name) AS len FROM food_reference
   WHERE ${words.map((_, i) => `search_text LIKE '%'||$${i + 1}||'%'`).join(' AND ')} AND calories_kcal IS NOT NULL
   ORDER BY name, brand, serving_amount, food_code LIMIT 500`,
  words);
 const plain = query.trim().replace(/\s+/g, '');
 const rank = (r: Row) => { const name = r.name.replace(/[\s_]/g, ''); return (name === plain ? 0 : name.startsWith(plain) ? 1 : name.includes(plain) ? 2 : 3) * 1000 + r.name.length; };
 return rows.sort((a, b) => rank(a) - rank(b)).slice(0, limit).map(toReference);
}

export async function foodReferenceByCode(code: string): Promise<FoodReference | null> {
 const {rows} = await getPool().query<Row>(`SELECT ${COLUMNS} FROM food_reference WHERE food_code=$1`, [code]);
 return rows[0] ? toReference(rows[0]) : null;
}

export async function foodReferencesByCodes(codes: string[]): Promise<FoodReference[]> {
 if (!codes.length) return [];
 const {rows} = await getPool().query<Row>(`SELECT ${COLUMNS} FROM food_reference WHERE food_code = ANY($1::text[])`, [codes]);
 const byCode = new Map(rows.map((r) => [r.food_code, toReference(r)]));
 return codes.flatMap((c) => { const r = byCode.get(c); return r ? [r] : []; });
}
