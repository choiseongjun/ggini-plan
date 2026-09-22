// Bulk-imports MFDS's live "식품영양성분DB정보" (FoodNtrCpntDbInfo03) service, a much larger unified
// database (~331k rows spanning DISH/PROCESSED/RAW in one place) than the static files already
// imported. No name/code search parameter works reliably on this endpoint (confirmed by testing —
// extra query params either get silently ignored or make the server hang), so this pages through
// the whole thing with pageNo/numOfRows (server-capped at 500) and upserts by food_code, which both
// enriches existing rows (fills previously-missing fat/carb) and adds any genuinely new ones.
// Resumable: pass --start=N to continue from page N if a run gets interrupted.
import pg from "pg";

const key = process.env.FOODSAFETY_BULK_API_KEY;
if (!key) throw new Error("FOODSAFETY_BULK_API_KEY is not set in the environment.");

const startArg = process.argv.find((a) => a.startsWith("--start="));
const startPage = startArg ? Number(startArg.split("=")[1]) : 1;
const PAGE_SIZE = 500;

const groupMap = { D: ["음식", "DISH"], P: ["가공식품", "PROCESSED"], R: ["원재료성식품", "RAW"] };
const num = (v) => { if (v === "" || v === null || v === undefined) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const text = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

async function fetchPage(pageNo, attempt = 1) {
  const url = `https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo03/getFoodNtrCpntDbInq03?serviceKey=${key}&pageNo=${pageNo}&numOfRows=${PAGE_SIZE}&type=json`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.header?.resultCode !== "00") throw new Error(data.header?.resultMsg ?? "unknown API error");
    return data.body;
  } catch (e) {
    if (attempt >= 3) throw e;
    console.log(`  page ${pageNo} failed (${e instanceof Error ? e.message : e}), retrying (${attempt + 1}/3)...`);
    await new Promise((r) => setTimeout(r, 3000));
    return fetchPage(pageNo, attempt + 1);
  }
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  let saved = 0, skippedGroup = 0, skippedInvalid = 0, page = startPage, totalPages = null;
  const startedAt = Date.now();
  for (;;) {
    const body = await fetchPage(page);
    if (totalPages === null) {
      totalPages = Math.ceil(body.totalCount / PAGE_SIZE);
      console.log(`총 ${body.totalCount}건, ${totalPages}페이지. ${startPage}페이지부터 시작합니다.`);
    }
    const items = body.items ?? [];
    for (const r of items) {
      const group = groupMap[r.DB_GRP_CM];
      if (!group) { skippedGroup++; continue; }
      const foodCode = text(r.FOOD_CD), itemName = text(r.FOOD_NM_KR);
      if (!foodCode || !itemName) { skippedInvalid++; continue; }
      const [datasetLabel, foodType] = group;
      await pool.query(
        `INSERT INTO foodsafety_processed_nutrition
          (food_code, item_name, representative_name, category_large, category_mid, category_small, basis_amount,
           calories_kcal, protein_g, fat_g, carbohydrates_g, sugar_g, sodium_mg, source_name, dataset_label, food_type, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
         ON CONFLICT (food_code) DO UPDATE SET
          item_name=EXCLUDED.item_name, representative_name=EXCLUDED.representative_name,
          category_large=EXCLUDED.category_large, category_mid=EXCLUDED.category_mid, category_small=EXCLUDED.category_small,
          basis_amount=EXCLUDED.basis_amount, calories_kcal=EXCLUDED.calories_kcal, protein_g=EXCLUDED.protein_g,
          fat_g=EXCLUDED.fat_g, carbohydrates_g=EXCLUDED.carbohydrates_g, sugar_g=EXCLUDED.sugar_g,
          sodium_mg=EXCLUDED.sodium_mg, source_name=EXCLUDED.source_name, dataset_label=EXCLUDED.dataset_label,
          food_type=EXCLUDED.food_type, updated_at=NOW()`,
        [foodCode, itemName, text(r.FOOD_REF_NM) || itemName, text(r.FOOD_CAT1_NM), text(r.FOOD_CAT2_NM), text(r.FOOD_CAT3_NM),
         text(r.SERVING_SIZE) ?? "100g", num(r.AMT_NUM1), num(r.AMT_NUM3), num(r.AMT_NUM4), num(r.AMT_NUM6), num(r.AMT_NUM7), num(r.AMT_NUM13),
         text(r.SUB_REF_NAME), datasetLabel, foodType],
      );
      saved++;
    }
    const elapsedMin = ((Date.now() - startedAt) / 60000).toFixed(1);
    console.log(`페이지 ${page}/${totalPages} 완료 · 누적 저장 ${saved}건 · 그룹외 건너뜀 ${skippedGroup} · 무효 ${skippedInvalid} · 경과 ${elapsedMin}분`);
    if (items.length < PAGE_SIZE || page >= totalPages) break;
    page++;
  }
  console.log(`전체 완료: 저장/갱신 ${saved}건, 그룹외 제외 ${skippedGroup}건, 무효 데이터 ${skippedInvalid}건.`);
} finally {
  await pool.end();
}
