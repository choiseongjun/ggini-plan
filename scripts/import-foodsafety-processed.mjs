import pg from "pg";
import xlsx from "xlsx";

const file = "newdata/식품의약품안전처_가공식품 품목별 영양성분 DB_20221231.xlsx";
const num = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null);

const workbook = xlsx.readFile(file);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null }).slice(1);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  let count = 0;
  for (const r of rows) {
    const foodCode = String(r[1] ?? "").trim();
    const itemName = String(r[2] ?? "").trim();
    if (!foodCode || !itemName) continue;
    await pool.query(
      `INSERT INTO foodsafety_processed_nutrition
        (food_code, item_name, representative_name, category_large, category_mid, category_small, basis_amount,
         calories_kcal, protein_g, fat_g, carbohydrates_g, sugar_g, sodium_mg, serving_size_note, source_name, dataset_label, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'가공식품',NOW())
       ON CONFLICT (food_code) DO UPDATE SET
        item_name=EXCLUDED.item_name, representative_name=EXCLUDED.representative_name,
        category_large=EXCLUDED.category_large, category_mid=EXCLUDED.category_mid, category_small=EXCLUDED.category_small,
        basis_amount=EXCLUDED.basis_amount, calories_kcal=EXCLUDED.calories_kcal, protein_g=EXCLUDED.protein_g,
        fat_g=EXCLUDED.fat_g, carbohydrates_g=EXCLUDED.carbohydrates_g, sugar_g=EXCLUDED.sugar_g,
        sodium_mg=EXCLUDED.sodium_mg, serving_size_note=EXCLUDED.serving_size_note, source_name=EXCLUDED.source_name,
        dataset_label='가공식품', updated_at=NOW()`,
      [
        foodCode, itemName, String(r[3] ?? "").trim() || itemName,
        String(r[4] ?? "").trim() || null, String(r[5] ?? "").trim() || null, String(r[6] ?? "").trim() || null,
        String(r[7] ?? "").trim(),
        num(r[8]), num(r[10]), num(r[11]), num(r[13]), num(r[14]), num(r[20]),
        String(r[33] ?? "").trim() || null, String(r[32] ?? "").trim() || null,
      ],
    );
    count++;
  }
  console.log(`식약처 가공식품 영양성분DB ${count}건을 foodsafety_processed_nutrition에 반영했습니다.`);
} finally {
  await pool.end();
}
