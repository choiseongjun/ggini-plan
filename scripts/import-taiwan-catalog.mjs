import {readFileSync} from 'node:fs';
import pg from 'pg';

const manifest=JSON.parse(readFileSync(new URL('../data/taiwan-catalog.json',import.meta.url),'utf8'));
const env=readFileSync(new URL('../.env.local',import.meta.url),'utf8');
const connectionString=env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if(!connectionString)throw new Error('DATABASE_URL missing');
const client=new pg.Client({connectionString});
try{
 await client.connect();await client.query('BEGIN');
 await client.query(readFileSync(new URL('../db/taiwan.sql',import.meta.url),'utf8'));
 for(const p of manifest.products){
  if(!p.id.startsWith('tw-laurel-')||!Number.isSafeInteger(p.priceMinor)||p.priceMinor<=0||p.servings!==1)throw new Error('Invalid reviewed product');
  const existing=await client.query('SELECT market_code FROM catalog_items WHERE id=$1',[p.id]);
  if(existing.rows.some(r=>r.market_code!=='TW'))throw new Error('Cross-market ID collision');
  await client.query(`INSERT INTO catalog_items
   (id,name,detail,price,portions,quantity,search_query,product_url,unit,emoji,color,category,in_weekly_cart,market_code,currency_code,source_locale,product_image_url,price_checked_at,price_note,nutrition_source_name,nutrition_source_url,nutrition_photo_url,nutrition_basis,calories_kcal,protein_g,fat_g,carbohydrates_g,sodium_mg)
   VALUES ($1,$2,$3,$4,'1 包／1 份',$5,$2,$6,'g',$7,'#eef3e6','frozen_meal',false,'TW','TWD','zh-TW',$8,$9,'官方商城單包售價，未含運費；結帳價格為準','桂冠官方營養標示',$6,$10,$11,$12,$13,$14,$15,$16)
   ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,detail=EXCLUDED.detail,price=EXCLUDED.price,quantity=EXCLUDED.quantity,product_url=EXCLUDED.product_url,product_image_url=EXCLUDED.product_image_url,price_checked_at=EXCLUDED.price_checked_at,price_note=EXCLUDED.price_note,nutrition_source_name=EXCLUDED.nutrition_source_name,nutrition_source_url=EXCLUDED.nutrition_source_url,nutrition_photo_url=EXCLUDED.nutrition_photo_url,nutrition_basis=EXCLUDED.nutrition_basis,calories_kcal=EXCLUDED.calories_kcal,protein_g=EXCLUDED.protein_g,fat_g=EXCLUDED.fat_g,carbohydrates_g=EXCLUDED.carbohydrates_g,sodium_mg=EXCLUDED.sodium_mg,updated_at=NOW()`,
   [p.id,p.name,`${p.grams}g · 1 包 · 冷凍`,p.priceMinor,p.grams,p.productUrl,p.family==='pasta'?'🍝':'🍚',p.imageUrl,manifest.checkedAt,p.nutritionLabelUrl,`${p.grams}g`,p.calories,p.protein,p.fat,p.carbs,p.sodium]);
  await client.query(`INSERT INTO catalog_serving_profiles(product_id,servings,serving_grams,nutrition_basis_grams,meal_slots,source_url,verified_at) VALUES($1,1,$2,$2,$3,$4,$5) ON CONFLICT(product_id) DO UPDATE SET servings=1,serving_grams=EXCLUDED.serving_grams,nutrition_basis_grams=EXCLUDED.nutrition_basis_grams,meal_slots=EXCLUDED.meal_slots,source_url=EXCLUDED.source_url,verified_at=EXCLUDED.verified_at`,[p.id,p.grams,p.mealSlots,p.nutritionLabelUrl,manifest.checkedAt]);
  await client.query(`INSERT INTO catalog_offers(id,product_id,market_code,currency_code,seller_key,seller_product_id,price_minor,product_url,availability,checked_at,source_url) VALUES($1,$2,'TW','TWD','laurel',$3,$4,$5,'unknown',$6,$5) ON CONFLICT(id) DO UPDATE SET price_minor=EXCLUDED.price_minor,checked_at=EXCLUDED.checked_at,product_url=EXCLUDED.product_url`,[`tw-laurel-offer-${p.sellerId}`,p.id,p.sellerId,p.priceMinor,p.productUrl,manifest.checkedAt]);
 }
 await client.query('COMMIT');console.log(`Imported ${manifest.products.length} reviewed Taiwan products (TWD minor units).`);
}catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}
