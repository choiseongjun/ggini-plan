// 전국통합식품영양성분정보(음식) JSON을 food_reference 테이블로 넣는다. 다시 실행하면 갱신(upsert).
// 사용: node --env-file=.env.local scripts/import-food-reference.mjs [json 경로]
import {readFileSync} from 'node:fs';
import pg from 'pg';

const path = process.argv[2] ?? 'newdata/전국통합식품영양성분정보_음식_표준데이터.json';
const raw = JSON.parse(readFileSync(path, 'utf8'));
const rows = Array.isArray(raw) ? raw : (raw.records ?? raw.data ?? Object.values(raw).find(Array.isArray));
const num = (v) => { const n = Number(String(v ?? '').replace(/,/g, '').trim()); return v === '' || v == null || !Number.isFinite(n) ? null : n; };
// "100g" / "473ml" / "1개(80g)" → [양, 단위]
const amount = (v) => {
 const text = String(v ?? '').replace(/\s/g, '');
 const m = text.match(/(\d+(?:\.\d+)?)(g|ml|mL|ML)(?!.*\d+(?:\.\d+)?(?:g|ml))/i);
 return m ? [Number(m[1]), m[2].toLowerCase() === 'g' ? 'g' : 'mL'] : [null, null];
};

const items = rows.flatMap((r) => {
 const [basis, basisUnit] = amount(r['영양성분함량기준량']);
 if (!r['식품코드'] || !r['식품명'] || !basis) return [];
 const [serving, servingUnit] = amount(r['식품중량']);
 const brand = String(r['업체명'] ?? '').trim().replace(/^해당없음$/, '') || null;
 const name = String(r['식품명']).trim();
 return [{
  code: r['식품코드'], name, brand, category: r['식품대분류명'] || null, origin: r['식품기원명'] || null,
  basis, basisUnit, serving, servingUnit,
  kcal: num(r['에너지(kcal)']), protein: num(r['단백질(g)']), fat: num(r['지방(g)']), carbs: num(r['탄수화물(g)']), sugar: num(r['당류(g)']), sodium: num(r['나트륨(mg)']),
  search: `${name} ${brand ?? ''} ${r['대표식품명'] ?? ''}`.toLowerCase().replace(/[\s_()·,.\-\[\]]/g, ''),
 }];
});
console.log(`원본 ${rows.length}건 중 ${items.length}건을 넣습니다.`);

const pool = new pg.Pool({connectionString: process.env.DATABASE_URL});
const cols = ['food_code', 'name', 'brand', 'category', 'origin', 'basis_amount', 'basis_unit', 'serving_amount', 'serving_unit', 'calories_kcal', 'protein_g', 'fat_g', 'carbohydrates_g', 'sugar_g', 'sodium_mg', 'search_text'];
for (let i = 0; i < items.length; i += 500) {
 const batch = items.slice(i, i + 500);
 const values = [], params = [];
 batch.forEach((x, j) => {
  values.push(`(${cols.map((_, k) => `$${j * cols.length + k + 1}`).join(',')})`);
  params.push(x.code, x.name, x.brand, x.category, x.origin, x.basis, x.basisUnit, x.serving, x.servingUnit, x.kcal, x.protein, x.fat, x.carbs, x.sugar, x.sodium, x.search);
 });
 await pool.query(`INSERT INTO food_reference(${cols.join(',')}) VALUES ${values.join(',')}
  ON CONFLICT(food_code) DO UPDATE SET ${cols.slice(1).map((c) => `${c}=EXCLUDED.${c}`).join(',')},updated_at=NOW()`, params);
 process.stdout.write(`\r${Math.min(i + 500, items.length)}/${items.length}`);
}
console.log('\n완료');
await pool.end();
