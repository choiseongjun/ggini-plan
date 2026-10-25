import {getPool} from './db';
import {nutritionAmount, parseDetailedNutrients, type DetailedNutritionData} from './detailed-nutrition';

export async function getDetailedNutrition(code: string): Promise<DetailedNutritionData | null> {
 return (await getDetailedNutritionBatch([code])).get(code)??null;
}

export async function getDetailedNutritionBatch(codes:string[]):Promise<Map<string,DetailedNutritionData>> {
 if(!codes.length)return new Map();
 const {rows} = await getPool().query<{
  food_code:string; raw_record: Record<string, unknown>; headers: string[]; file_name: string; source_date: string | null;
 }>(`SELECT DISTINCT ON (s.food_code) s.food_code, s.raw_record, f.headers, f.file_name, s.source_date::text
     FROM kfind_nutrition_snapshots s JOIN kfind_import_files f USING (source_sha256)
     WHERE s.food_code = ANY($1::text[]) AND s.food_type IN ('DISH', 'PROCESSED') AND f.completed_at IS NOT NULL
     ORDER BY s.food_code, s.source_date DESC, s.source_sha256`, [[...new Set(codes)]]);
 return new Map(rows.map(row=>{
 const raw=row.raw_record, code=row.food_code;
 const basisText=String(raw['영양성분함량기준량']??'기준량 미확인');
 return [code,{code, name: String(raw['식품명'] ?? code), basisText, basis: nutritionAmount(basisText),
  serving:nutritionAmount(String(raw['1회섭취참고량']??raw['식품중량']??'')),
  source: String(raw['출처명'] ?? '식품의약품안전처 식품영양성분 DB'), sourceDate: row.source_date,
  fileName: row.file_name, nutrients: parseDetailedNutrients(raw, row.headers)}];
 }));
}
