import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import pg from 'pg';

// Dry run by default. Only reviewed manifest values may be written.
const apply=process.argv.includes('--apply');
const manifest=JSON.parse(await fs.readFile('data/catalog-nutrition-2026-09-17.json','utf8'));
const fields=['calories_kcal','protein_g','carbohydrates_g','fat_g','sodium_mg'];
const ids=new Set();
for(const item of manifest.items){
 assert(!ids.has(item.id),`Duplicate ${item.id}`);ids.add(item.id);
 assert(item.basis&&item.basis.length<=120&&item.sourceName&&item.sourceName.length<=120);
 assert(new URL(item.sourceUrl).protocol==='https:');
 for(const key of fields)assert(item[key]===null||(Number.isFinite(item[key])&&item[key]>=0&&item[key]<=100000),`${item.id} ${key}`);
}
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
const client=await pool.connect();
const audit={startedAt:new Date().toISOString(),mode:apply?'apply':'dry-run',updated:[],unchanged:[],conflicts:[]};
try{
 await client.query('BEGIN');
 for(const item of manifest.items){
  const row=(await client.query('SELECT * FROM catalog_items WHERE id=$1 FOR UPDATE',[item.id])).rows[0];
  if(!row){audit.conflicts.push({id:item.id,reason:'missing'});continue;}
  const sameValues=fields.every(key=>(row[key]===null?null:Number(row[key]))===item[key]);
  if(sameValues&&row.nutrition_basis===item.basis&&row.nutrition_source_url===item.sourceUrl){audit.unchanged.push(item.id);continue;}
  const baselineMatches=fields.every(key=>(row[key]===null?null:Number(row[key]))===item.expectedNutrition[key])&&Object.entries(item.expectedSource).every(([key,value])=>row[key]===value);
  if(!baselineMatches||row.name!==item.name||row.detail!==item.detail||row.product_url!==item.productUrl){audit.conflicts.push({id:item.id,reason:'Changed since research; administrator edit preserved'});continue;}
  // Never replace an existing non-null numeric value, even with a new label.
  if(fields.some(key=>row[key]!==null&&Number(row[key])!==item[key])){audit.conflicts.push({id:item.id,reason:'Existing numeric value differs'});continue;}
  audit.updated.push({id:item.id,before:Object.fromEntries([...fields,'nutrition_basis','nutrition_source_name','nutrition_source_url','nutrition_photo_url'].map(k=>[k,row[k]])),after:item});
  if(apply)await client.query(`UPDATE catalog_items SET calories_kcal=$2,protein_g=$3,carbohydrates_g=$4,fat_g=$5,sodium_mg=$6,nutrition_basis=$7,nutrition_source_name=$8,nutrition_source_url=$9,nutrition_photo_url=COALESCE(nutrition_photo_url,$10),updated_at=NOW() WHERE id=$1`,[item.id,...fields.map(k=>item[k]),item.basis,item.sourceName,item.sourceUrl,item.photoUrl]);
 }
 await fs.mkdir('data/nutrition-review',{recursive:true});
 const auditFile=`data/nutrition-review/${apply?'applied':'dry-run'}-${Date.now()}.json`;
 await fs.writeFile(auditFile,JSON.stringify(audit,null,2)+'\n');
 await client.query(apply?'COMMIT':'ROLLBACK');
 const counts=(await client.query(`SELECT COUNT(*)::int total,COUNT(*) FILTER (WHERE calories_kcal IS NOT NULL AND protein_g IS NOT NULL AND carbohydrates_g IS NOT NULL AND fat_g IS NOT NULL AND sodium_mg IS NOT NULL)::int complete,COUNT(*) FILTER (WHERE calories_kcal IS NULL AND protein_g IS NULL AND carbohydrates_g IS NULL AND fat_g IS NULL AND sodium_mg IS NULL)::int empty FROM catalog_items`)).rows[0];
 console.log(JSON.stringify({mode:audit.mode,updated:audit.updated.length,unchanged:audit.unchanged.length,conflicts:audit.conflicts,counts,auditFile},null,2));
}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();await pool.end();}
