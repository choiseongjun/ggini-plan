import fs from 'node:fs/promises';
import pg from 'pg';
const data=JSON.parse(await fs.readFile('data/shopping-verified-2026-09-17.json','utf8'));
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
const c=await pool.connect();let inserted=0,enriched=0;
try{
 await c.query('BEGIN');
 for(const p of data.rows){
  if(!p.available)continue;
  const created=await c.query(`INSERT INTO catalog_items(id,name,detail,price,portions,quantity,unit,category,emoji,color,search_query,product_url,product_image_url,price_checked_at,price_note,in_weekly_cart)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,'🥣','mint',$2,$9,$10,$11,'판매 구성 1개 기준 · 쿠폰 적용 전 표시가 · 배송비 별도',FALSE) ON CONFLICT(id) DO NOTHING`,[p.id,p.name,p.detail,p.price,p.portions,p.quantity,p.unit,p.category,p.productUrl,p.productImageUrl,p.checkedAt]);
  inserted+=created.rowCount;
  if(p.nutrition){const n=p.nutrition;
   const updated=await c.query(`UPDATE catalog_items SET nutrition_basis=$2,calories_kcal=$3,protein_g=$4,carbohydrates_g=$5,fat_g=$6,sodium_mg=$7,nutrition_source_name='컬리 판매 페이지의 제품 영양표 · 원본 대조',nutrition_source_url=$8,nutrition_photo_url=$9,updated_at=NOW()
    WHERE id=$1 AND updated_by IS NULL AND calories_kcal IS NULL AND protein_g IS NULL AND carbohydrates_g IS NULL AND fat_g IS NULL AND sodium_mg IS NULL AND name=$10 AND detail=$11`,[p.id,n.basis,n.caloriesKcal,n.proteinG,n.carbohydratesG,n.fatG,n.sodiumMg,p.productUrl,n.photoUrl,p.name,p.detail]);
   enriched+=updated.rowCount;
  }
 }
 await c.query('COMMIT');console.log({inserted,enriched,total:(await c.query('SELECT COUNT(*) FROM catalog_items')).rows[0].count});
}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();await pool.end();}
