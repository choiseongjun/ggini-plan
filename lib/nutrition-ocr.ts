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

export function extractNutrition(raw: string, latin = ""): ExtractedNutrition {
  const text = raw.normalize("NFKC").replaceAll(/(?<=[가-힣])\s+(?=[가-힣])/g, "").replaceAll(/(\d)\s+(\.\d)/g, "$1$2");
  const basisMatch = text.match(/(?:1회\s*(?:제공량|분량)|총\s*내용량|내용량)\s*[:：]?\s*(\d+(?:\.\d+)?)\s*(g|ml|개|팩|봉)/iu)
    ?? text.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*(g|ml)\s*당/iu);
  const nutritionBasis = basisMatch ? `${basisMatch[1]}${basisMatch[2]}당` : null;
  const extracted: ExtractedNutrition = {
    nutritionBasis,
    caloriesKcal: valueFor(text, /열량|에너지|칼로리|calories/, "kcal|kCal|㎉"),
    proteinG: valueFor(text, /단백질|protein/, "g|그램"),
    carbohydratesG: valueFor(text, /탄수화물|carbohydrate(?:s)?/, "g|그램"),
    fatG: valueFor(text, /(?<!포화)(?<!트랜스)지방|total\s*fat/, "g|그램"),
    sodiumMg: valueFor(text, /나트륨|sodium/, "mg|밀리그램"),
  };
  if (latin) {
    const koreanLines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const latinLines = latin.normalize("NFKC").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const labels: [RegExp, keyof Omit<ExtractedNutrition, "nutritionBasis">, string][] = [
      [/열량|에너지|칼로리/gu, "caloriesKcal", "kcal"],
      [/탄수화물/gu, "carbohydratesG", "g"],
      [/단백질/gu, "proteinG", "g"],
      [/(?<!포화)(?<!트랜스)지방/gu, "fatG", "g"],
      [/나트륨/gu, "sodiumMg", "mg"],
    ];
    for (let index = 0; index < Math.min(koreanLines.length, latinLines.length); index++) {
      const line = koreanLines[index];
      const recognizedLabels = labels.flatMap(([pattern, field, unit]) => [...line.matchAll(pattern)].map((match) => ({ position: match.index, field, unit }))).sort((a, b) => a.position - b.position);
      const numbers = [...latinLines[index].matchAll(/(\d+(?:[.,]\d+)?)\s*(kcal|mg|g|ml)\b/giu)].map((match) => ({ value: Number(match[1].replace(",", ".")), unit: match[2].toLowerCase() }));
      if (!extracted.nutritionBasis && /제공량|내용량|\d+\s*(?:g|ml)\s*당/u.test(line)) {
        const measure = numbers.find((number) => number.unit === "g" || number.unit === "ml");
        if (measure) extracted.nutritionBasis = `${measure.value}${measure.unit}당`;
      }
      if (recognizedLabels.length !== numbers.length) continue;
      recognizedLabels.forEach((label, position) => {
        const number = numbers[position];
        if (label.unit === number.unit && extracted[label.field] === null) extracted[label.field] = number.value;
      });
    }
  }
  return extracted;
}
