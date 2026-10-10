export type NutritionAmount = {value: number; unit: 'g' | 'mL'};
export type DetailedNutrient = {key: string; name: string; unit: string; value: number | null; text: string; group: string};
export type DetailedNutritionData = {
 code: string; name: string; basisText: string; basis: NutritionAmount | null;
 source: string; sourceDate: string | null; fileName: string;
 nutrients: DetailedNutrient[];
};

export function nutritionAmount(text: string): NutritionAmount | null {
 const match = text.replaceAll(',', '').trim().match(/^(\d+(?:\.\d+)?)\s*(mg|kg|g|ml|l)$/i);
 if (!match) return null;
 const unit = match[2].toLowerCase();
 const value = Number(match[1]) * (unit === 'kg' || unit === 'l' ? 1000 : unit === 'mg' ? .001 : 1);
 return Number.isFinite(value) && value > 0 ? {value, unit: unit === 'ml' || unit === 'l' ? 'mL' : 'g'} : null;
}

function groupFor(name: string) {
 if (/^(에너지|수분|단백질|지방|회분|탄수화물|당류|식이섬유)$/.test(name)) return '기본 영양';
 if (/^(칼슘|철|인|칼륨|나트륨|구리|마그네슘|망간|몰리브덴|불소|셀레늄|아연|염소|요오드|크롬)$/.test(name)) return '무기질';
 if (/비타민|레티놀|카로틴|티아민|리보플라빈|니아신|니코틴|비오틴|엽산|콜린|판토텐산|토코페롤|토코트리에놀/.test(name)) return '비타민 및 관련 성분';
 if (/아미노산|^(글루탐산|글라이신|라이신|류신|메티오닌|발린|세린|시스테인|아르기닌|아스파르트산|알라닌|이소류신|타우린|트레오닌|트립토판|티로신|페닐알라닌|프롤린|히스티딘)$/.test(name)) return '아미노산';
 if (/지방산|콜레스테롤|EPA|DHA|\d+:\d+/.test(name)) return '지방산·콜레스테롤';
 if (/갈락토오스|과당|당알콜|맥아당|알룰로오스|에리스리톨|유당|자당|타가토스|포도당/.test(name)) return '당 세부 성분';
 return '기타 성분';
}

// Match the final unit suffix, including headers whose nutrient name has nested parentheses.
// Source header order is retained; JSONB object key order is not the spreadsheet order.
export function parseDetailedNutrients(raw: Record<string, unknown>, headers: string[]): DetailedNutrient[] {
 return [...new Set(headers)].flatMap(key => {
  const match = key.match(/^(.*)\((kcal|g|mg|[μµ]g)([^()]*)\)$/);
  const text = String(raw[key] ?? '').trim();
  if (!match || !text || ['-', '해당없음', 'N/A'].includes(text)) return [];
  const numeric = text.replaceAll(',', '');
  const value = /^\d+(?:\.\d+)?$/.test(numeric) && Number.isFinite(Number(numeric)) ? Number(numeric) : null;
  const name = match[1].trim();
  return [{key, name, unit: `${match[2]}${match[3]}`, value, text, group: groupFor(name)}];
 });
}

export function nutritionScale(basis: NutritionAmount | null, amount?: NutritionAmount | null): number | null {
 if (!basis || !amount || basis.unit !== amount.unit || !Number.isFinite(amount.value) || amount.value <= 0) return null;
 return amount.value / basis.value;
}

export function nutrientText(nutrient: DetailedNutrient, scale: number): string {
 if (nutrient.value === null) return nutrient.text;
 const value = nutrient.value * scale;
 // Tiny positive micronutrient values must never round down to an apparent zero.
 return value.toLocaleString('ko-KR', {maximumSignificantDigits: 7});
}

export function detailedFoodCode(id: string): string | null {
 const code = id.startsWith('ref:') ? id.slice(4) : id;
 return /^[DP][A-Za-z0-9-]{1,79}$/.test(code) ? code : null;
}
