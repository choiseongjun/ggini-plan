import {readFile} from 'node:fs/promises';
import pg from 'pg';
const root=new URL('../',import.meta.url);
const data=JSON.parse(await readFile(new URL('data/regional-prices/preview.json',root),'utf8'));
if(data.manifest.kamisMode!=='api'||data.manifest.tpriceMode!=='web'||!data.kamis.length||!data.tprice.length||data.manifest.apiItems!==136||data.manifest.tpriceCategoryCount!==13)throw Error('Incomplete collection; database unchanged');
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
try{
 await client.connect();await client.query('BEGIN');
 await client.query(await readFile(new URL('db/regional-prices.sql',root),'utf8'));
 for(const source of ['kamis','tprice']){
  const date=source==='kamis'?data.manifest.kamisDate:data.manifest.tpriceDates.at(-1);
  const collected=source==='kamis'?data.manifest.kamisCollectedAt:data.manifest.tpriceCollectedAt;
  const result=await client.query(`INSERT INTO regional_price_snapshots(source,survey_date,collected_at,payload,metadata) VALUES($1,$2,$3,$4,$5) ON CONFLICT(source) DO UPDATE SET survey_date=EXCLUDED.survey_date,collected_at=EXCLUDED.collected_at,payload=EXCLUDED.payload,metadata=EXCLUDED.metadata,updated_at=now() WHERE regional_price_snapshots.survey_date<=EXCLUDED.survey_date AND regional_price_snapshots.collected_at<=EXCLUDED.collected_at`,[source,date,collected,JSON.stringify(data[source]),JSON.stringify(data.manifest)]);
  if(result.rowCount!==1)throw Error('Older snapshot rejected');
 }
 await client.query('COMMIT');console.log('Published validated KAMIS and store snapshots');
}catch{await client.query('ROLLBACK').catch(()=>{});console.error('Price publication failed; database transaction rolled back');process.exitCode=1;}finally{await client.end();}
