import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import pg from 'pg';
import { isDeepStrictEqual } from 'node:util';

// Human-reviewed label transcriptions only. Never derive contains from OCR or shared-facility text.
const apply = process.argv.includes('--apply');
const reviews = JSON.parse(await fs.readFile('data/catalog-allergy-review-2026-09-17.json', 'utf8'));
const aliases = {
 egg:/계란|달걀|알류|난류/, milk:/우유/, soy:/대두/, wheat:/밀/, chicken:/닭고기/,
 beef:/쇠고기|소고기/, pork:/돼지고기/, shrimp:/새우/, crab:/(?:^|,\s*)게(?:,|$)/,
 squid:/오징어/, shellfish:/조개류|굴/, fish:/고등어|명태알|가다랑어|멸치/,
 peanut:/땅콩/, nuts:/호두|잣|피칸/, buckwheat:/메밀/, tomato:/토마토/,
 sulfites:/아황산류|이산화황/, peach:/복숭아/, sesame:/참깨/, banana:/바나나/, rice:/쌀/,
};
const sourceOverrides = {
 rice:'https://www.elandmall.co.kr/i/item?itemNo=2112035190',
 'frozen-shrimp-fried-rice':'https://m.shinsegaetvshopping.com/display/detail/48365577?category_code=20100240',
};
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
const directory = 'data/nutrition-review';
const snapshotFile = `${directory}/allergies-before.json`;
const audit = { mode: apply ? 'apply' : 'dry-run', updated: [], unchanged: [], conflicts: [] };
try {
 await fs.mkdir(directory, {recursive:true});
 const rows = (await client.query('SELECT id,name,detail,product_url,allergens FROM catalog_items ORDER BY id')).rows;
 try { await fs.writeFile(snapshotFile, JSON.stringify(rows,null,2), {flag:'wx'}); } catch (e) { if(e.code!=='EEXIST')throw e; }
 const baseline = JSON.parse(await fs.readFile(snapshotFile,'utf8'));
 const ids = new Set();
 const manifest = [];
 for (const [shortId, statement, note='', status='verified'] of reviews) {
  const id = /^\d+$/.test(shortId) ? `kurly-${shortId}` : shortId;
  assert(!ids.has(id), `Duplicate ${id}`); ids.add(id);
  const original = baseline.find(row=>row.id===id); assert(original, `Missing baseline ${id}`);
  const research = JSON.parse(await fs.readFile(`${directory}/${id}.json`,'utf8'));
  const sourceUrl = sourceOverrides[id] ?? original.product_url;
  const evidenceUrls = ['rice','frozen-shrimp-fried-rice','kurly-1002042275'].includes(id) ? [] : [...new Set(research.labels.map(label=>label.url))];
  const allergyInfo = {
   status, statement: statement ? `${statement}${status==='ingredients' ? ' (원재료 확인)' : ' 함유'}` : '',
   note, sourceUrl, evidenceUrls,
   crossContactNote: '제조시설·혼입 가능성 목록은 별도 확인 필요. 함유 성분 목록만으로 섭취 안전을 판단하지 마세요. 원문 표시사항과 수령한 포장지를 확인하세요.',
  };
  if(id==='kurly-1002042275')allergyInfo.crossContactNote='새우, 오징어, 메밀, 땅콩, 토마토, 고등어, 게, 복숭아, 아황산류, 호두, 닭고기, 조개류(굴, 전복, 홍합), 잣 혼입 가능';
  const allergens = Object.entries(aliases).filter(([,pattern])=>pattern.test(`${statement} ${note.startsWith('원재료에')?note:''}`)).map(([key])=>key);
  assert(['unknown','partial','ingredients','verified'].includes(status));
  assert(status!=='verified'||statement.length>0);
  assert(new URL(sourceUrl).protocol==='https:');
  manifest.push({id,expected:original,allergens,allergyInfo});
 }
 // Complete inventory coverage; don't silently ignore items added by another editor.
 const notReviewed=rows.filter(row=>!ids.has(row.id)).map(row=>row.id);
 assert(notReviewed.length===0,`Unreviewed products: ${notReviewed.join(', ')}`);
 await client.query('BEGIN');
 if(apply)await client.query('ALTER TABLE catalog_items ADD COLUMN IF NOT EXISTS allergy_info JSONB');
 for(const item of manifest){
  const row=(await client.query('SELECT * FROM catalog_items WHERE id=$1 FOR UPDATE',[item.id])).rows[0];
  if(isDeepStrictEqual(row.allergens,item.allergens)&&isDeepStrictEqual(row.allergy_info,item.allergyInfo)){audit.unchanged.push(item.id);continue;}
  if(!['name','detail','product_url'].every(key=>row[key]===item.expected[key]) || JSON.stringify(row.allergens)!==JSON.stringify(item.expected.allergens) || row.allergy_info){audit.conflicts.push(item.id);continue;}
  audit.updated.push({id:item.id,before:{allergens:row.allergens,allergyInfo:row.allergy_info??null},after:item});
  if(apply)await client.query('UPDATE catalog_items SET allergens=$2::text[],allergy_info=$3::jsonb,updated_at=NOW() WHERE id=$1',[item.id,item.allergens,JSON.stringify(item.allergyInfo)]);
 }
 await fs.writeFile(`${directory}/allergies-${apply?'applied':'dry-run'}-${Date.now()}.json`,JSON.stringify(audit,null,2));
 await fs.writeFile('data/catalog-allergies-2026-09-17.json',JSON.stringify(manifest,null,2)+'\n');
 await client.query(apply?'COMMIT':'ROLLBACK');
 console.log(JSON.stringify({mode:audit.mode,total:manifest.length,updated:audit.updated.length,unchanged:audit.unchanged.length,conflicts:audit.conflicts,statuses:Object.fromEntries(['verified','ingredients','partial','unknown'].map(status=>[status,manifest.filter(x=>x.allergyInfo.status===status).length]))},null,2));
}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();await pool.end();}
