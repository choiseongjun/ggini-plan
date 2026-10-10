export const nutrientFields = {
 calories_kcal: '에너지(kcal)', protein_g: '단백질(g)', fat_g: '지방(g)',
 carbohydrates_g: '탄수화물(g)', sugar_g: '당류(g)', sodium_mg: '나트륨(mg)',
};
const groups = { D: ['DISH', '음식'], P: ['PROCESSED', '가공식품'], F: ['SUPPLEMENT', '건강기능식품'] };
export function clean(value) {
 const result = String(value ?? '').trim();
 return !result || ['-', '해당없음', 'N/A'].includes(result) ? null : result;
}
export function number(value) {
 const text = clean(value)?.replaceAll(',', '');
 if (!text) return null;
 if (!/^\d+(?:\.\d+)?$/.test(text)) throw new Error(`Invalid nutrition number: ${text}`);
 const result = Number(text);
 if (!Number.isFinite(result) || result >= 100000000) throw new Error(`Out of range: ${text}`);
 return result;
}
// Never interpret a package count or ambiguous label as a weight, nor convert mL to g.
export function amount(value) {
 const match = clean(value)?.replaceAll(',', '').match(/^\s*(\d+(?:\.\d+)?)\s*(mg|g|kg|ml|l)\s*$/i);
 if (!match || Number(match[1]) <= 0) return null;
 const unit = match[2].toLowerCase();
 return { value: Number(match[1]) * (unit === 'kg' || unit === 'l' ? 1000 : unit === 'mg' ? .001 : 1),
  unit: unit === 'ml' || unit === 'l' ? 'mL' : 'g' };
}
export function normalize(raw) {
 const group = groups[raw['데이터구분코드']];
 const code = clean(raw['식품코드']), name = clean(raw['식품명']);
 if (!group || !code || !name || !code.startsWith(raw['데이터구분코드'])) throw new Error('Invalid identity/group');
 const date = clean(raw['데이터기준일자']);
 if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') || Number.isNaN(Date.parse(date))) throw new Error('Invalid source date');
 const basisText = clean(raw['영양성분함량기준량'] ?? raw['영양성분제공단위량']);
 const basis = amount(basisText);
 if (!basis && group[0] !== 'SUPPLEMENT') throw new Error(`Invalid basis: ${code}: ${basisText}`);
 const servingText = clean(raw['1인(회)분량 참고량'] ?? raw['1회 섭취참고량']);
 const serving = amount(servingText) ?? (group[0] === 'DISH' ? amount(raw['식품중량']) : null);
 const compatible = serving && basis && serving.unit === basis.unit ? serving : null;
 const brand = clean(raw['업체명'] ?? raw['제조사명']);
 const row = { food_code: code, item_name: name, representative_name: clean(raw['대표식품명']) ?? name,
  category_large: clean(raw['식품대분류명']), category_mid: clean(raw['식품중분류명']), category_small: clean(raw['식품소분류명']),
  basis_amount: basisText, source_name: clean(raw['출처명']) ?? 'K-FIND 식품영양성분 DB',
  dataset_label: group[1], food_type: group[0], source_date: date,
  serving_size_note: servingText, brand, origin: clean(raw['식품기원명']),
  reference_basis: basis?.value ?? null, reference_unit: basis?.unit ?? null,
  serving_amount: compatible?.value ?? null, serving_unit: compatible?.unit ?? null,
  search_text: `${name} ${brand ?? ''} ${raw['대표식품명'] ?? ''}`.toLowerCase().replace(/[\s_()·,.\-\[\]]/g, ''),
 };
 for (const [column, source] of Object.entries(nutrientFields)) row[column] = number(raw[source]);
 return row;
}
