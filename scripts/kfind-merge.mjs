import {nutrientFields} from './kfind-normalize.mjs';

export const nutrients = Object.keys(nutrientFields);
export const nutritionColumns = ['food_code','item_name','representative_name','category_large','category_mid','category_small',
 'basis_amount',...nutrients,'serving_size_note','source_name','dataset_label','food_type'];
// Unknown or different denominators must never be mixed when filling missing nutrients.
export const sameBasis = "lower(regexp_replace(t.basis_amount,'\\s','','g'))=lower(regexp_replace(s.basis_amount,'\\s','','g'))";
export const missingNutrition = nutrients.map(c => `(t.${c} IS NULL AND s.${c} IS NOT NULL)`).join(' OR ');
export const referenceSelect = `SELECT food_code,item_name AS name,brand,category_large AS category,origin,
 reference_basis AS basis_amount,reference_unit AS basis_unit,serving_amount,serving_unit,
 ${nutrients.join(',')},search_text FROM kfind_stage WHERE reference_basis>0`;
export const referenceColumns = ['food_code','name','brand','category','origin','basis_amount','basis_unit',
 'serving_amount','serving_unit',...nutrients,'search_text'];
export const sameReferenceBasis = 't.basis_amount=s.basis_amount AND t.basis_unit=s.basis_unit';

export const mergeStatements = {
 // Enrich before inserting: reference data can grow 17x, making pre-insert planner
 // statistics unsuitable for an unnecessary update join against the new rows.
 nutrition_enriched: `UPDATE foodsafety_processed_nutrition t SET
 ${nutrients.map(c=>`${c}=COALESCE(t.${c},s.${c})`).join(',')},updated_at=NOW()
 FROM kfind_stage s WHERE t.food_code=s.food_code AND ${sameBasis} AND (${missingNutrition})`,
 nutrition_inserted: `INSERT INTO foodsafety_processed_nutrition (${nutritionColumns.join(',')})
 SELECT ${nutritionColumns.map(c=>'s.'+c).join(',')} FROM kfind_stage s
 WHERE NOT EXISTS (SELECT 1 FROM foodsafety_processed_nutrition t WHERE t.food_code=s.food_code)
 ON CONFLICT (food_code) DO NOTHING`,
 reference_enriched: `UPDATE food_reference t SET
 ${nutrients.map(c=>`${c}=COALESCE(t.${c},s.${c})`).join(',')},updated_at=NOW()
 FROM (${referenceSelect}) s WHERE t.food_code=s.food_code AND ${sameReferenceBasis} AND (${missingNutrition})`,
 reference_inserted: `INSERT INTO food_reference (${referenceColumns.join(',')})
 SELECT ${referenceColumns.map(c=>'s.'+c).join(',')} FROM (${referenceSelect}) s
 WHERE NOT EXISTS (SELECT 1 FROM food_reference t WHERE t.food_code=s.food_code)
 ON CONFLICT (food_code) DO NOTHING`,
};
