// Run after collection. Resume cheaply through the per-URL local score cache.
import {appendFileSync, mkdirSync} from 'node:fs';
import {getPool} from '../lib/db.ts';
import {reviewedRecipeImages} from '../lib/reviewed-recipe-images.ts';
import {selectFoodPhotos} from './food-photo-selector.mjs';

const apply = process.argv.includes('--apply');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 100000;
if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('Invalid limit');
const pool = getPool();
mkdirSync('.cache/food-photo-review', {recursive: true});
let changed = 0, uncertain = 0, failed = 0;
try {
 const {rows} = await pool.query('SELECT food_code,target_name,image_url,image_urls FROM recipe_optimizer_results WHERE image_url IS NOT NULL ORDER BY food_code LIMIT $1', [limit]);
 console.log(`Local image review: ${rows.length} recipes; apply=${apply}`);
 for (const [index, row] of rows.entries()) {
  if (reviewedRecipeImages(row.food_code)) continue;
  try {
   const urls = [...new Set([row.image_url, ...(row.image_urls ?? [])].filter(Boolean))];
   const approved = await selectFoodPhotos(urls);
   if (!approved.length) { uncertain++; continue; } // Never replace with an uncertain guess.
   if (row.image_url === approved[0] && JSON.stringify(row.image_urls) === JSON.stringify(approved)) continue;
   // Preserve candidates before mutation for audit/recovery.
   appendFileSync('.cache/food-photo-review/changes.jsonl', JSON.stringify({at: new Date().toISOString(), apply, before: row, approved}) + '\n');
   if (apply) {
    const result = await pool.query('UPDATE recipe_optimizer_results SET image_url=$1,image_urls=$2::jsonb WHERE food_code=$3 AND image_url=$4 AND image_urls IS NOT DISTINCT FROM $5::jsonb', [approved[0],JSON.stringify(approved),row.food_code,row.image_url,JSON.stringify(row.image_urls)]);
    if (!result.rowCount) continue; // Another process changed the candidates.
   }
   changed++;
   console.log(`[${index + 1}/${rows.length}] ${row.target_name}: ${urls.length} -> ${approved.length}`);
  } catch (error) {
   failed++;
   console.error(`${row.food_code}: ${error.message}`);
   if (failed >= 5) throw new Error('Stopping after five failures; rerun to resume.');
  }
 }
 console.log(JSON.stringify({complete: true, changed, uncertain, failed, apply}));
 if (failed) process.exitCode = 1;
} finally { await pool.end(); }
