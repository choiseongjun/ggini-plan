import fs from 'node:fs';
import pg from 'pg';
const manifest=JSON.parse(fs.readFileSync('data/taiwan-products.json','utf8'));
if(manifest.market!=='TW'||manifest.currency!=='TWD'||new Set(manifest.products.map(p=>p.id)).size!==manifest.products.length)throw new Error('Invalid Taiwan catalog');
const env=fs.readFileSync('.env.local','utf8');
const client=new pg.Client({connectionString:env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim()});
try{
 await client.connect();await client.query('BEGIN');
 await client.query(fs.readFileSync('db/taiwan.sql','utf8'));
 await client.query(fs.readFileSync('db/taiwan-catalog-details.sql','utf8'));
 await client.query(`INSERT INTO market_sellers VALUES('TW',$1,$2,$3) ON CONFLICT DO NOTHING`,[manifest.sellerKey,manifest.seller,manifest.sellerUrl]);
 for(const p of manifest.products){
  if(!/^tw-uniprosperity-\d+$/.test(p.id)||!Number.isSafeInteger(p.priceMinor)||p.priceMinor<=0||new URL(p.productUrl).origin!==manifest.sellerUrl)throw new Error('Invalid source record');
  const existing=await client.query('SELECT market_code FROM catalog_items WHERE id=$1',[p.id]);if(existing.rows.some(r=>r.market_code!=='TW'))throw new Error('Market collision');
  await client.query(`INSERT INTO catalog_items(id,name,detail,price,portions,quantity,search_query,product_url,unit,emoji,color,category,in_weekly_cart,market_code,currency_code,source_locale,product_image_url,price_checked_at,price_note)
   VALUES($1,$2,$3,$4,'販售單位；餐數待確認',1,$2,$5,'개',$6,'#eef3e6',$7,false,'TW','TWD','zh-TW',$8,$9,'賣場標示的販售價格，未含運費；規格、優惠及配送以結帳為準')
   ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,detail=EXCLUDED.detail,price=EXCLUDED.price,product_url=EXCLUDED.product_url,product_image_url=EXCLUDED.product_image_url,price_checked_at=EXCLUDED.price_checked_at,updated_at=NOW()`,[p.id,p.name,`${p.packLabel} · ${p.categoryPath.at(-1)??'食品'} · 1 個販售單位`.slice(0,200),p.priceMinor,p.productUrl,p.category==='ingredient'?'🥬':'🍱',p.category,p.imageUrl,p.checkedAt]);
  await client.query(`INSERT INTO catalog_source_details VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(product_id) DO UPDATE SET seller_name=EXCLUDED.seller_name,category_path=EXCLUDED.category_path,pack_label=EXCLUDED.pack_label,source_url=EXCLUDED.source_url,checked_at=EXCLUDED.checked_at`,[p.id,manifest.seller,p.categoryPath,p.packLabel,p.sourceUrl,p.checkedAt]);
  await client.query(`INSERT INTO catalog_offers(id,product_id,market_code,currency_code,seller_key,seller_product_id,price_minor,product_url,availability,checked_at,source_url) VALUES($1,$2,'TW','TWD',$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO UPDATE SET price_minor=EXCLUDED.price_minor,product_url=EXCLUDED.product_url,availability=EXCLUDED.availability,checked_at=EXCLUDED.checked_at`,[p.id+':offer',p.id,manifest.sellerKey,p.sellerId,p.priceMinor,p.productUrl,p.availability,p.checkedAt,p.sourceUrl]);
 }
 await client.query('COMMIT');console.log(`Imported ${manifest.products.length} Taiwan products; reviewed serving profiles untouched.`);
}catch(e){await client.query('ROLLBACK');throw e;}finally{await client.end();}
