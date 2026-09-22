// One-time/resumable backfill: fetches several candidate food photos for every recipe_optimizer_results
// row missing one, via Kakao's Daum Image Search (lib/kakao-image-search.ts). Quota is generous enough
// (Kakao search APIs default to 100,000 calls/day) to run to completion in one pass.
import {listRecipeOptimizerResultsMissingImage, setRecipeOptimizerImages} from '../lib/recipe-optimizer-store.ts';
import {searchDishImages} from '../lib/kakao-image-search.ts';

const missing = await listRecipeOptimizerResultsMissingImage();
console.log(`이미지 없는 레시피 ${missing.length}건. 시작합니다.`);
let saved = 0, skipped = 0, failed = 0;
for (const [i, dish] of missing.entries()) {
 try {
  const results = await searchDishImages(dish.targetName);
  if (!results.length) { skipped++; console.log(`[${i + 1}/${missing.length}] (검색결과 없음) ${dish.targetName}`); continue; }
  await setRecipeOptimizerImages(dish.foodCode, results.map((r) => r.thumbnail));
  saved++;
  console.log(`[${i + 1}/${missing.length}] ${dish.targetName} -> ${results.length}장 (${results.map((r) => r.sourceHost || '?').join(', ')})`);
 } catch (e) {
  failed++;
  console.log(`[${i + 1}/${missing.length}] 실패: ${dish.targetName} (${e instanceof Error ? e.message : e})`);
 }
 // Kakao has no documented per-second cap for this endpoint, but a small delay keeps this a good citizen.
 await new Promise((r) => setTimeout(r, 100));
}
console.log(`완료: 저장 ${saved}건, 결과없음 ${skipped}건, 실패 ${failed}건.`);
process.exit(0);
