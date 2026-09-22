import fs from "node:fs/promises";
import pg from "pg";

const file = "newdata/전국통합식품영양성분정보_원재료성식품_표준데이터.json";
const num = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const text = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);

const { records } = JSON.parse(await fs.readFile(file, "utf8"));

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  let count = 0;
  for (const r of records) {
    const foodCode = text(r["식품코드"]);
    const itemName = text(r["식품명"]);
    if (!foodCode || !itemName) continue;
    await pool.query(
      `INSERT INTO foodsafety_processed_nutrition
        (food_code, item_name, representative_name, category_large, category_mid, category_small, basis_amount,
         calories_kcal, protein_g, fat_g, carbohydrates_g, sugar_g, sodium_mg, serving_size_note, source_name, dataset_label, food_type, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'원재료성식품','RAW',NOW())
       ON CONFLICT (food_code) DO UPDATE SET
        item_name=EXCLUDED.item_name, representative_name=EXCLUDED.representative_name,
        category_large=EXCLUDED.category_large, category_mid=EXCLUDED.category_mid, category_small=EXCLUDED.category_small,
        basis_amount=EXCLUDED.basis_amount, calories_kcal=EXCLUDED.calories_kcal, protein_g=EXCLUDED.protein_g,
        fat_g=EXCLUDED.fat_g, carbohydrates_g=EXCLUDED.carbohydrates_g, sugar_g=EXCLUDED.sugar_g,
        sodium_mg=EXCLUDED.sodium_mg, serving_size_note=EXCLUDED.serving_size_note, source_name=EXCLUDED.source_name,
        dataset_label='원재료성식품', food_type='RAW', updated_at=NOW()`,
      [
        foodCode, itemName, text(r["대표식품명"]) || itemName,
        text(r["식품대분류명"]), text(r["식품중분류명"]), text(r["식품소분류명"]),
        text(r["영양성분함량기준량"]) ?? "100g",
        num(r["에너지(kcal)"]), num(r["단백질(g)"]), num(r["지방(g)"]), num(r["탄수화물(g)"]), num(r["당류(g)"]), num(r["나트륨(mg)"]),
        text(r["폐기율(%)"]) ? `폐기율 ${r["폐기율(%)"]}%` : null, text(r["출처명"]),
      ],
    );
    count++;
  }
  console.log(`전국통합식품영양성분정보(원재료성식품) ${count}건을 foodsafety_processed_nutrition에 반영했습니다.`);
} finally {
  await pool.end();
}
