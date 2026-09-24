// 음식 영양 검색 페이지 주소표(food_pages)를 food_reference에서 다시 만든다.
//   node --env-file=.env.local --import tsx scripts/build-food-pages.ts
import {readFileSync} from 'node:fs';
import {getPool} from '../lib/db';
import {displayFoodName, foodSlug} from '../lib/food-reference';

async function main() {
 const db = getPool();
 await db.query(readFileSync('db/food-pages.sql', 'utf8'));
 const {rows} = await db.query<{food_code: string; name: string; brand: string | null; category: string | null; basis_amount: string; serving_amount: string | null; calories_kcal: string | null}>(
  'SELECT food_code,name,brand,category,basis_amount,serving_amount,calories_kcal FROM food_reference WHERE calories_kcal IS NOT NULL');
 // 같은 주소(브랜드+이름)는 1회 제공량이 가장 큰 행을 대표로.
 const best = new Map<string, {code: string; name: string; brand: string | null; category: string | null; kcal: number; size: number}>();
 for (const r of rows) {
  const name = displayFoodName(r.name), slug = foodSlug(name, r.brand);
  if (!slug) continue;
  const size = Number(r.serving_amount ?? r.basis_amount), kcal = Number(r.calories_kcal) * size / Number(r.basis_amount);
  const prev = best.get(slug);
  if (!prev || size > prev.size) best.set(slug, {code: r.food_code, name, brand: r.brand, category: r.category, kcal: Math.round(kcal), size});
 }
 const entries = [...best.entries()];
 await db.query('DELETE FROM food_pages');
 for (let i = 0; i < entries.length; i += 500) {
  const batch = entries.slice(i, i + 500), params: unknown[] = [];
  const values = batch.map(([slug, v], j) => { params.push(slug, v.code, v.name, v.brand, v.category, v.kcal); return `($${j * 6 + 1},$${j * 6 + 2},$${j * 6 + 3},$${j * 6 + 4},$${j * 6 + 5},$${j * 6 + 6})`; });
  await db.query(`INSERT INTO food_pages(slug,food_code,name,brand,category,kcal) VALUES ${values.join(',')}`, params);
 }
 console.log(`음식 페이지 ${entries.length}개`);
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
