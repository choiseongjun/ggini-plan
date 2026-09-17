import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import pg from 'pg';
import {inferFoodType} from '../lib/catalog-food-types';
const env=readFileSync(resolve('.env.local'),'utf8');
const key=process.argv.includes('--local')?'DATABASE_URL_LOCAL':'DATABASE_URL';
const connectionString=env.match(new RegExp('^'+key+'=(.+)$','m'))?.[1]?.trim().replace(/^['"]|['"]$/g,'');
if(!connectionString)throw new Error(key+' is missing');
const client=new pg.Client({connectionString});
const apply=process.argv.includes('--apply');
async function main(){
await client.connect();
try{
 await client.query('BEGIN');
 await client.query(readFileSync(resolve('db/catalog-food-types.sql'),'utf8'));
 const {rows}=await client.query('SELECT id,name FROM catalog_items WHERE market_code=\'KR\' AND food_type IS NULL');
 const counts: Record<string,number>={};
 for(const row of rows){
  const kind=inferFoodType(row.name);
  counts[kind??'unclassified']=(counts[kind??'unclassified']??0)+1;
  if(kind)await client.query('UPDATE catalog_items SET food_type=$1 WHERE id=$2 AND food_type IS NULL',[kind,row.id]);
 }
 await client.query(apply?'COMMIT':'ROLLBACK');
 console.log(JSON.stringify({applied:apply,reviewed:rows.length,counts},null,2));
}catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}

}
void main().catch(error=>{console.error(error.message);process.exitCode=1;});
