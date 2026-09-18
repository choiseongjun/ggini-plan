import type {ExtractedNutrition} from './nutrition-ocr';
export type NutritionPhotoResult = {
  extracted?: ExtractedNutrition; images?: string[]; imageUrl?: string | null;
  text?: string; warning?: string | null;
};
export function nutritionFieldCount(result: NutritionPhotoResult) {
  if (!result.extracted?.nutritionBasis) return 0;
  return ['caloriesKcal','proteinG','carbohydratesG','fatG','sodiumMg'].filter(key=>
    typeof result.extracted![key as keyof ExtractedNutrition] === 'number').length;
}
// Keep one table intact. Never fill a missing nutrient from a different image/basis.
export async function readNutritionPhotos<T extends NutritionPhotoResult>(read: (index?:number)=>Promise<T>, onProgress:(index:number,total:number)=>void) {
  let best = await read();
  const total = Math.min(best.images?.length ?? 0, 8);
  const checkedImages = best.imageUrl ? 1 : 0;
  let checked = checkedImages;
  for(let index=1;index<total && nutritionFieldCount(best)<5;index++) {
    onProgress(index+1,total);
    const candidate = await read(index); checked++;
    if(nutritionFieldCount(candidate)>nutritionFieldCount(best)) best=candidate;
  }
  return {...best,checkedImages:checked};
}
