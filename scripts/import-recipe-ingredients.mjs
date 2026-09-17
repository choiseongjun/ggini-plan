import {readFile,writeFile} from 'node:fs/promises';
import pg from 'pg';

// Reviewed against volume/name on the public product pages in the evidence manifest.
// g/ml are never interchanged; eggs are counted, raw rice is not cooked rice.
const amounts={rice:4000,onion:500,carrot:500,mushroom:140,sesameOil:320,oil:500,salt:500,pumpkin:500,riceFlour:300,sugar:400,shrimp:200,chicken:500,milk:1000,cheese:270,beef:300,egg:20,pasta:500,tomatoSauce:600};
const evidenceFields={mushroom:'name',sugar:'name',egg:'salesUnit'};
const root=new URL('../data/',import.meta.url);
const offers=JSON.parse(await readFile(new URL('recipe-ingredient-offers.json',root),'utf8'));
const recipe=JSON.parse(await readFile(new URL('recipe-comparison.json',root),'utf8'));
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
try{
 if(process.argv.includes('--prepare')){
  const rows=[];
  for(const p of offers.rows){
   const amount=amounts[p.key],ingredient=recipe.ingredients[p.key];
   if(!amount||!ingredient||!p.sourceUrl.startsWith('https://www.kurly.com/goods/')||!Number.isSafeInteger(p.price)||p.price<=0)throw new Error('Invalid offer');
   const existing=(await pool.query('SELECT id,name,detail,unit,quantity,price,product_url FROM catalog_items WHERE product_url=$1',[p.sourceUrl])).rows;
   if(existing.length>1)throw new Error(`Duplicate source ${p.key}`);
   const storage=(p.storageTypes??[]).map(s=>({COLD:'냉장',FROZEN:'냉동',ROOM:'상온',ROOM_TEMPERATURE:'상온',AMBIENT_TEMPERATURE:'상온'}[s]??s)).join('/');
   const unit=ingredient.unit==='g'?'g':'개';
   const row=existing[0]??{id:`kurly-${p.productNo}`,name:p.name,detail:[`${amount}${ingredient.unit}`,p.salesUnit||'1묶음',storage].filter(Boolean).join(' · '),unit,quantity:unit==='g'?amount:1,price:p.price};
   rows.push({key:p.key,...row,quantity:Number(row.quantity),isNew:!existing.length,sourceUrl:p.sourceUrl,imageUrl:p.imageUrl,checkedAt:p.checkedAt,amount,amountUnit:ingredient.unit,amountEvidence:{field:evidenceFields[p.key]??'volume',value:p[evidenceFields[p.key]??'volume']},allergyText:p.allergyText});
  }
  if(rows.length!==Object.keys(recipe.ingredients).length)throw new Error('Incomplete ingredient coverage');
  await writeFile(new URL('recipe-ingredient-import.json',root),JSON.stringify({rows},null,2)+'\n');
  console.log(JSON.stringify({ingredients:rows.length,insert:rows.filter(r=>r.isNew).length,reuse:rows.filter(r=>!r.isNew).length}));
 }else if(process.argv.includes('--apply')){
  const {rows}=JSON.parse(await readFile(new URL('recipe-ingredient-import.json',root),'utf8'));
  const c=await pool.connect();let inserted=0;
  try{
   await c.query('BEGIN');
   await c.query('LOCK TABLE catalog_items IN SHARE ROW EXCLUSIVE MODE');
   for(const p of rows){
    if(p.isNew){
     const allergy={status:'unknown',statement:p.allergyText??'',sourceUrl:p.sourceUrl,evidenceUrls:[],note:'판매 페이지 알레르기 안내 수집. 전체 원재료 표시 검수 전.',crossContactNote:'원문 및 수령한 포장지 확인 필요'};
     const result=await c.query(`INSERT INTO catalog_items(id,name,detail,price,portions,quantity,unit,category,emoji,color,search_query,product_url,product_image_url,price_checked_at,price_note,in_weekly_cart,allergens,allergy_info)
      SELECT $1,$2,$3,$4,'1묶음',$5,$6,'ingredient','🧺','mint',$2,$7,$8,$9,'컬리 단일 판매 구성 표시가 · 쿠폰·배송비 별도',FALSE,$10::text[],$11::jsonb
      WHERE NOT EXISTS(SELECT 1 FROM catalog_items WHERE product_url=$7) ON CONFLICT(id) DO NOTHING`,[p.id,p.name,p.detail,p.price,p.quantity,p.unit,p.sourceUrl,p.imageUrl,p.checkedAt,recipe.ingredients[p.key].exclude,JSON.stringify(allergy)]);
     inserted+=result.rowCount;
    }
    const saved=(await c.query('SELECT name,detail,unit,quantity,product_url FROM catalog_items WHERE id=$1',[p.id])).rows[0];
    if(!saved||saved.name!==p.name||saved.detail!==p.detail||saved.unit!==p.unit||Number(saved.quantity)!==p.quantity||saved.product_url!==p.sourceUrl)throw new Error(`Catalog changed: ${p.key}. Re-prepare without overwriting.`);
   }
   await c.query('COMMIT');
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  recipe.productLinks=rows.map(p=>({key:p.key,id:p.id,name:p.name,detail:p.detail,unit:p.unit,quantity:p.quantity,amount:p.amount,amountUnit:p.amountUnit,sourceUrl:p.sourceUrl,amountEvidence:p.amountEvidence}));
  for(const item of Object.values(recipe.ingredients))item.priceStatus='catalog-linked';
  await writeFile(new URL('recipe-comparison.json',root),JSON.stringify(recipe,null,2)+'\n');
  console.log(JSON.stringify({inserted,linked:rows.length,existingProductsUnchanged:true}));
 }else throw new Error('Use --prepare or --apply');
}finally{await pool.end();}
