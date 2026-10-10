// Default is a local validation-only pass. --apply imports into DATABASE_URL.
import {createReadStream,createWriteStream} from 'node:fs';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {createGunzip,createGzip} from 'node:zlib';
import {createInterface} from 'node:readline';
import {once} from 'node:events';
import {finished} from 'node:stream/promises';
import pg from 'pg';
import {normalize,nutrientFields} from './kfind-normalize.mjs';
import {mergeStatements,missingNutrition,sameBasis,referenceSelect,sameReferenceBasis} from './kfind-merge.mjs';

const directory=resolve(process.argv.find(a=>a.startsWith('--input='))?.slice(8)??'.cache/kfind');
const apply=process.argv.includes('--apply');
const manifest=JSON.parse(await readFile(resolve(directory,'manifest.json'),'utf8'));
const report={started_at:new Date().toISOString(),mode:apply?'apply':'validate',files:[],policy:'preserve existing values; fill missing only on matching basis; supplements archive only'};
const reportPath=resolve(directory,apply?'import-report.json':'validation-report.json');
const hashes=new Set();
async function hash(path){const h=createHash('sha256');for await(const chunk of createReadStream(path))h.update(chunk);return h.digest('hex');}
async function* records(path){
 const input=createReadStream(path), unzipped=createGunzip();
 input.on('error',e=>unzipped.destroy(e)); input.pipe(unzipped);
 const lines=createInterface({input:unzipped,crlfDelay:Infinity});
 try{for await(const line of lines)if(line.trim())yield JSON.parse(line);}
 finally{lines.close();input.destroy();unzipped.destroy();}
}

// Complete validation before any database write. Cache content is authenticated to manifest.
for(const file of manifest){
 if(!/^[a-f0-9]{64}$/.test(file.source_sha256)||hashes.has(file.source_sha256)||basename(file.output)!==file.output)throw new Error('Invalid manifest');
 hashes.add(file.source_sha256);
 if(await hash(resolve(directory,file.output))!==file.output_sha256)throw new Error(`Checksum mismatch: ${file.file}`);
 const seen=new Set();let count=0;const types={};
 for await(const raw of records(resolve(directory,file.output))){
  const row=normalize(raw);
  if(seen.has(row.food_code))throw new Error(`Duplicate: ${row.food_code}`);
  seen.add(row.food_code);count++;types[row.food_type]=(types[row.food_type]??0)+1;
 }
 if(count!==file.rows)throw new Error(`Row count mismatch: ${file.file}`);
 report.files.push({file:file.file,source_sha256:file.source_sha256,rows:count,types});
 console.log(`Validated ${file.file}: ${count}`);
}
await writeFile(reportPath,JSON.stringify(report,null,2));
if(!apply){console.log('Validation complete. Use --apply to import.');process.exit(0);}
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is missing');
const client=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:15000});
let transaction=false,locked=false;
async function backup(label,query){
 const path=resolve(directory,`before-${report.started_at.replace(/[:.]/g,'-')}-${label}.jsonl.gz`);
 const gzip=createGzip(), output=createWriteStream(path);gzip.pipe(output);
 output.on('error',e=>gzip.destroy(e));const complete=finished(output);
 let count=0;
 try{
  await client.query(`DECLARE kfind_backup NO SCROLL CURSOR FOR ${query}`);
  for(;;){
   const result=await client.query('FETCH 1000 FROM kfind_backup');
   if(!result.rows.length)break;
   for(const {record} of result.rows){if(!gzip.write(JSON.stringify(record)+'\n'))await once(gzip,'drain');count++;}
  }
  await client.query('CLOSE kfind_backup');gzip.end();await complete;
 }catch(e){gzip.destroy();output.destroy();await complete.catch(()=>{});throw e;}
 return {path,rows:count};
}
try{
 await client.connect();
 locked=(await client.query("SELECT pg_try_advisory_lock(hashtext('kfind-import')) AS locked")).rows[0].locked;
 if(!locked)throw new Error('Another K-FIND import is running');
 await client.query(await readFile(new URL('../db/kfind-nutrition.sql',import.meta.url),'utf8'));
 report.before=(await client.query('SELECT food_type,count(*)::int AS count FROM foodsafety_processed_nutrition GROUP BY food_type')).rows;
 report.reference_before=Number((await client.query('SELECT count(*) AS n FROM food_reference')).rows[0].n);
 await client.query(`CREATE TEMP TABLE kfind_stage (LIKE foodsafety_processed_nutrition INCLUDING DEFAULTS);
 ALTER TABLE kfind_stage ADD PRIMARY KEY(food_code);
 ALTER TABLE kfind_stage ALTER COLUMN updated_at DROP NOT NULL;
 ALTER TABLE kfind_stage ADD COLUMN source_date DATE, ADD COLUMN brand TEXT, ADD COLUMN origin TEXT,
 ADD COLUMN reference_basis NUMERIC, ADD COLUMN reference_unit TEXT, ADD COLUMN serving_amount NUMERIC,
 ADD COLUMN serving_unit TEXT, ADD COLUMN search_text TEXT`);
 for(const file of manifest){
  await client.query(`INSERT INTO kfind_import_files (source_sha256,file_name,sheet_name,headers,expected_rows)
   VALUES ($1,$2,$3,$4::jsonb,$5) ON CONFLICT (source_sha256) DO NOTHING`,
   [file.source_sha256,file.file,file.sheet,JSON.stringify(file.headers),file.rows]);
  let batch=[],count=0;
  async function flush(){
   if(!batch.length)return;
   await client.query(`WITH input AS (SELECT value AS x FROM jsonb_array_elements($1::jsonb)), archived AS (
    INSERT INTO kfind_nutrition_snapshots (source_sha256,food_code,food_type,source_date,raw_record)
    SELECT $2,x->'row'->>'food_code',x->'row'->>'food_type',(x->'row'->>'source_date')::date,x->'raw' FROM input
    ON CONFLICT (source_sha256,food_code) DO NOTHING)
    INSERT INTO kfind_stage SELECT (jsonb_populate_record(NULL::pg_temp.kfind_stage,x->'row')).*
    FROM input WHERE x->'row'->>'food_type'<>'SUPPLEMENT'`,[JSON.stringify(batch),file.source_sha256]);
   count+=batch.length;batch=[];
   if(count%25000===0)console.log(`Staged ${file.file}: ${count}`);
  }
  for await(const raw of records(resolve(directory,file.output))){batch.push({raw,row:normalize(raw)});if(batch.length>=1000)await flush();}
  await flush();
  const archived=Number((await client.query('SELECT count(*) AS n FROM kfind_nutrition_snapshots WHERE source_sha256=$1',[file.source_sha256])).rows[0].n);
  if(archived!==file.rows)throw new Error('Archive count mismatch');
  console.log(`Archived ${file.file}: ${archived}`);
 }
 await client.query('ANALYZE kfind_stage');
 const conflict=Object.keys(nutrientFields).map(c=>`(t.${c} IS NOT NULL AND s.${c} IS NOT NULL AND t.${c}<>s.${c})`).join(' OR ');
 report.conflicts=(await client.query(`SELECT count(*) FILTER (WHERE NOT (${sameBasis}))::int AS different_basis,
  count(*) FILTER (WHERE ${sameBasis} AND (${conflict}))::int AS different_existing_nutrition
  FROM foodsafety_processed_nutrition t JOIN kfind_stage s USING(food_code)`)).rows[0];
 await client.query('BEGIN');transaction=true;
 await client.query("SET LOCAL lock_timeout='15s'");
 await client.query('SET LOCAL cursor_tuple_fraction=1.0');
 // Freeze only the two import targets while backing up and merging; no unrelated migrations.
 await client.query('LOCK TABLE foodsafety_processed_nutrition,food_reference IN SHARE ROW EXCLUSIVE MODE');
 report.backups=[
  await backup('foodsafety_processed_nutrition',`SELECT to_jsonb(t) AS record FROM foodsafety_processed_nutrition t JOIN kfind_stage s USING(food_code) WHERE ${sameBasis} AND (${missingNutrition})`),
  await backup('food_reference',`SELECT to_jsonb(t) AS record FROM food_reference t JOIN (${referenceSelect}) s USING(food_code) WHERE ${sameReferenceBasis} AND (${missingNutrition})`),
  await backup('nutrition-new-codes',`SELECT jsonb_build_object('food_code',s.food_code) AS record FROM kfind_stage s WHERE NOT EXISTS (SELECT 1 FROM foodsafety_processed_nutrition t WHERE t.food_code=s.food_code)`),
  await backup('reference-new-codes',`SELECT jsonb_build_object('food_code',s.food_code) AS record FROM kfind_stage s WHERE NOT EXISTS (SELECT 1 FROM food_reference t WHERE t.food_code=s.food_code)`),
 ];
 report.applied={};
 for(const [label,sql]of Object.entries(mergeStatements)){
  report.applied[label]=(await client.query(sql)).rowCount;
  console.log(`${label}: ${report.applied[label]}`);
 }
 await client.query('ANALYZE foodsafety_processed_nutrition; ANALYZE food_reference');
 const missing=Number((await client.query(`SELECT count(*) AS n FROM kfind_stage s
  LEFT JOIN foodsafety_processed_nutrition t USING(food_code) LEFT JOIN food_reference r USING(food_code)
  WHERE t.food_code IS NULL OR r.food_code IS NULL`)).rows[0].n);
 if(missing)throw new Error(`Missing imported foods: ${missing}`);
 for(const file of manifest)await client.query('UPDATE kfind_import_files SET completed_at=COALESCE(completed_at,NOW()) WHERE source_sha256=$1',[file.source_sha256]);
 report.after=(await client.query('SELECT food_type,count(*)::int AS count FROM foodsafety_processed_nutrition GROUP BY food_type')).rows;
 report.reference_after=Number((await client.query('SELECT count(*) AS n FROM food_reference')).rows[0].n);
 await client.query('COMMIT');transaction=false;
 report.completed_at=new Date().toISOString();
 await writeFile(reportPath,JSON.stringify(report,null,2));
 await client.query('ANALYZE kfind_nutrition_snapshots');
 console.log(JSON.stringify(report,null,2));
}catch(error){
 if(transaction)await client.query('ROLLBACK');
 report.error=error.message;await writeFile(reportPath,JSON.stringify(report,null,2));throw error;
}finally{
 if(locked)await client.query("SELECT pg_advisory_unlock(hashtext('kfind-import'))").catch(()=>{});
 await client.end();
}
