import {getPool} from './db';
import {nutritionAmount, parseDetailedNutrients, type DetailedNutritionData} from './detailed-nutrition';

export async function getDetailedNutrition(code: string): Promise<DetailedNutritionData | null> {
 const {rows} = await getPool().query<{
  raw_record: Record<string, unknown>; headers: string[]; file_name: string; source_date: string | null;
 }>(`SELECT s.raw_record, f.headers, f.file_name, s.source_date::text
     FROM kfind_nutrition_snapshots s JOIN kfind_import_files f USING (source_sha256)
     WHERE s.food_code = $1 AND s.food_type IN ('DISH', 'PROCESSED') AND f.completed_at IS NOT NULL
     ORDER BY s.source_date DESC, s.source_sha256 LIMIT 1`, [code]);
 const row = rows[0];
 if (!row) return null;
 const raw = row.raw_record;
 const basisText = String(raw['영양성분함량기준량'] ?? '기준량 미확인');
 return {code, name: String(raw['식품명'] ?? code), basisText, basis: nutritionAmount(basisText),
  source: String(raw['출처명'] ?? '식품의약품안전처 식품영양성분 DB'), sourceDate: row.source_date,
  fileName: row.file_name, nutrients: parseDetailedNutrients(raw, row.headers)};
}
