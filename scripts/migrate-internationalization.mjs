import pg from 'pg';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const apply=process.argv.includes('--apply');
const key=process.argv.includes('--local')?'DATABASE_URL_LOCAL':'DATABASE_URL';
if(!process.env[key])throw new Error(`${key} is required; load .env.local explicitly`);
const db=new pg.Client({connectionString:process.env[key]});
await db.connect();
try{
 await db.query('BEGIN');
 await db.query("SET LOCAL lock_timeout='5s'");
 await db.query("SET LOCAL statement_timeout='60s'");
 await db.query(readFileSync(resolve(import.meta.dirname,'../db/internationalization.sql'),'utf8'));
 const result=await db.query('SELECT code,currency_code,status FROM markets ORDER BY code');
 await db.query(apply?'COMMIT':'ROLLBACK');
 console.log(JSON.stringify({applied:apply,markets:result.rows}));
}catch(error){await db.query('ROLLBACK');throw error;}finally{await db.end();}
