import {writeFile,readFile} from 'node:fs/promises';
import pg from 'pg';
const output=new URL('../data/catalog-oasis-pilot.json',import.meta.url);
const specs=[{id:2621,grams:420,name:'우리콩 솔잎두부 (찌개용 420g)'},{id:3560,grams:300,name:'좋은콩 부침두부 (300g)'},{id:3561,grams:300,name:'좋은콩 찌개두부 (300g)'}];
if(!process.argv.includes('--apply')){
 const rows=[];
 for(const spec of specs){
  const productUrl=`https://www.oasis.co.kr/product/detail/${spec.id}`;
  const response=await fetch(productUrl,{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const html=await response.text();
  const name=html.match(/property="og:title" content="([^"]+)"/)?.[1];
  const image=html.match(/property="og:image" content="([^"]+)"/)?.[1];
  const price=Number(html.match(/var discountPrice = "(\d+)"/)?.[1]);
  const displayed=html.match(/class="totalCouponDiscountPrice_price">([\d,]+)원/)?.[1];
  if(name!==spec.name||!image?.startsWith('https://')||!price||Number(displayed?.replaceAll(',',''))!==price)throw new Error(`Source changed: ${spec.id}`);
  rows.push({id:`oasis-${spec.id}`,name,detail:`${spec.grams}g · 1팩`,price,quantity:1,unit:'개',grams:spec.grams,category:'ingredient',foodType:'tofu',productUrl,productImageUrl:image,checkedAt:new Date().toISOString(),priceNote:'오아시스 판매 페이지 할인 판매가 · 쿠폰 적용 전 · 배송비 별도',market:'KR',currency:'KRW'});
 }
 await writeFile(output,JSON.stringify({source:'오아시스 공개 판매 페이지',rows},null,2)+'\n');console.log(JSON.stringify(rows,null,2));
}else{
 const {rows}=JSON.parse(await readFile(output,'utf8'));
 if(rows.length!==3)throw new Error('Pilot limited to three products');
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});const c=await pool.connect();
 try{await c.query('BEGIN');const inserted=[];
  for(const p of rows){const spec=specs.find(s=>`oasis-${s.id}`===p.id);if(!spec||p.name!==spec.name||p.grams!==spec.grams||p.productUrl!==`https://www.oasis.co.kr/product/detail/${spec.id}`||!Number.isSafeInteger(p.price)||p.price<=0)throw new Error('Invalid pilot item');
   const result=await c.query(`INSERT INTO catalog_items (id,name,detail,price,portions,quantity,unit,category,food_type,emoji,color,search_query,product_url,product_image_url,price_checked_at,price_note,in_weekly_cart,allergens,allergy_info,market_code,currency_code,source_locale) SELECT $1,$2,$3,$4,'1팩',1,'개','ingredient','tofu','🥛','mint',$2,$5,$6,$7,$8,false,ARRAY[]::text[],$9::jsonb,'KR','KRW','ko-KR' WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE id=$1 OR product_url=$5) RETURNING id`,[p.id,p.name,p.detail,p.price,p.productUrl,p.productImageUrl,p.checkedAt,p.priceNote,JSON.stringify({status:'unknown',statement:'',note:'원문 영양·알레르기 표시 검수 전',sourceUrl:p.productUrl,evidenceUrls:[]})]);inserted.push(...result.rows);
  }
  await c.query('COMMIT');console.log(JSON.stringify({inserted,verified:(await c.query("SELECT id,name,price,detail FROM catalog_items WHERE id=ANY($1::text[])",[rows.map(p=>p.id)])).rows},null,2));
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();await pool.end();}
}
