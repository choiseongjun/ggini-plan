export type ExtractedNutrition = {
  nutritionBasis: string | null;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbohydratesG: number | null;
  fatG: number | null;
  sodiumMg: number | null;
};

function valueFor(text: string, labels: RegExp, units: string): number | null {
  const pattern = new RegExp(`(?:${labels.source})[^\\n\\d]{0,18}([\\d,.]+)\\s*(?:${units})`, "iu");
  const match = text.match(pattern);
  if (!match) return null;
  const value = Number(match[1].replaceAll(",", ""));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function extractNutrition(raw: string): ExtractedNutrition {
  const text = raw.normalize("NFKC").replaceAll(/(?<=[가-힣])[^\S\r\n]+(?=[가-힣])/g, "").replaceAll(/(\d)\s+(\.\d)/g, "$1$2");
  if (hasMultipleNutritionTables(text)) return { ...emptyNutrition };
  const basisMatch = text.match(/(\d+(?:\.\d+)?)\s*(g|ml)\s*당/iu)
    ?? text.match(/(?:1회\s*(?:제공량|분량)|총\s*내용량|내용량)\s*[:：]?\s*(\d+(?:\.\d+)?)\s*(g|ml|개|팩|봉)/iu);
  const nutritionBasis = basisMatch ? `${basisMatch[1]}${basisMatch[2]}당` : null;
  const extracted: ExtractedNutrition = {
    nutritionBasis,
    caloriesKcal: valueFor(text, /열량|에너지|칼로리|calories/, "kcal|㎉") ?? standaloneCalories(text),
    proteinG: valueFor(text, /단백질|protein/, "g|그램"),
    carbohydratesG: valueFor(text, /탄수화물|carbohydrate(?:s)?/, "g|그램"),
    fatG: valueFor(text, /(?<!포화)(?<!트랜스)지방|total\s*fat/, "g|그램"),
    sodiumMg: valueFor(text, /나트륨|sodium/, "mg|밀리그램"),
  };
  return extracted;
}

export const emptyNutrition: ExtractedNutrition = {
  nutritionBasis: null, caloriesKcal: null, proteinG: null,
  carbohydratesG: null, fatG: null, sodiumMg: null,
};

export function hasMultipleNutritionTables(raw: string): boolean {
  const text = raw.normalize("NFKC").replaceAll(/[^\S\r\n]+/g, "");
  return [ /영양정보/gu, /나트륨/gu, /단백질/gu ].some(pattern => [...text.matchAll(pattern)].length > 1);
}

function standaloneCalories(text: string): number | null {
  const matches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(?:kcal|㎉)/giu)];
  return matches.length === 1 ? Number(matches[0][1]) : null;
}
