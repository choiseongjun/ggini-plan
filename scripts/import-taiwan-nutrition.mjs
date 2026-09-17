import fs from 'node:fs';
import pg from 'pg';
const {products}=JSON.parse(fs.readFileSync('data/taiwan-nutrition-reviewed.json','utf8'));
const env=fs.readFileSync('.env.local','utf8');
const client=new pg.Client({connectionString:env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim()});
await client.connect();
try{
 await client.query('BEGIN');
 for(const p of products){
  if(!p.id.startsWith('tw-uniprosperity-')||!p.labelUrl.startsWith('https://online.uni-prosperity.com.tw/')||!p.basisGrams||[p.calories,p.protein,p.fat,p.carbs,p.sodium].some(v=>!Number.isFinite(v)||v<0))throw new Error('Invalid verified nutrition');
  const result=await client.query(`UPDATE catalog_items SET nutrition_source_name='商品包裝營養標示（人工核對）',nutrition_source_url=$2,nutrition_photo_url=$3,nutrition_basis=$4,calories_kcal=$5,protein_g=$6,fat_g=$7,carbohydrates_g=$8,sodium_mg=$9,quantity=COALESCE($10,quantity),unit=CASE WHEN $10::numeric IS NULL THEN unit ELSE 'g' END,updated_at=NOW() WHERE id=$1 AND market_code='TW' AND currency_code='TWD' RETURNING id`,[p.id,p.sourceUrl,p.labelEmbedded?null:p.labelUrl,`${p.basisGrams}${p.basisUnit??'g'}`,p.calories,p.protein,p.fat,p.carbs,p.sodium,p.packGrams]);
  if(result.rowCount!==1)throw new Error(`Missing Taiwan product ${p.id}`);
  if(p.meal){
   if(p.basisGrams!==p.packGrams)throw new Error('A meal profile requires a verified whole-meal retail pack');
   await client.query(`INSERT INTO catalog_serving_profiles(product_id,servings,serving_grams,nutrition_basis_grams,meal_slots,source_url,verified_at) VALUES($1,1,$2,$2,ARRAY['lunch','dinner'],$3,$4) ON CONFLICT(product_id) DO UPDATE SET servings=1,serving_grams=EXCLUDED.serving_grams,nutrition_basis_grams=EXCLUDED.nutrition_basis_grams,meal_slots=EXCLUDED.meal_slots,source_url=EXCLUDED.source_url,verified_at=EXCLUDED.verified_at`,[p.id,p.packGrams,p.labelUrl,p.checkedAt]);
  }
 }
 await client.query('COMMIT');
 console.log(`Updated ${products.length} verified Taiwan nutrition labels; ${products.filter(p=>p.meal).length} additional meal profiles.`);
}catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}
