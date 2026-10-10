import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {normalize,number,amount} from '../scripts/kfind-normalize.mjs';
import {mergeStatements} from '../scripts/kfind-merge.mjs';

const fixture=(overrides={})=>({'식품코드':'D-test','식품명':'테스트 음식','데이터구분코드':'D',
 '데이터기준일자':'2026-08-28','영양성분함량기준량':'100g','에너지(kcal)':'100',
 '단백질(g)':'0','식품중량':'200g',...overrides});
test('zero is data, blank is unknown, malformed numbers are rejected',()=>{
 assert.equal(number('0'),0);assert.equal(number(''),null);assert.equal(number(null),null);
 assert.equal(number('1,234.50'),1234.5);assert.throws(()=>number('5mg'));assert.throws(()=>number('-2'));
 const r=normalize(fixture());assert.equal(r.protein_g,0);assert.equal(r.fat_g,null);
});
test('serving denominators never mix volume and weight or assume one package is one serving',()=>{
 assert.deepEqual(amount('500mg'),{value:.5,unit:'g'});assert.equal(amount('1개(100g)'),null);
 assert.equal(normalize(fixture({'식품중량':'200mL'})).serving_amount,null);
 const packaged=normalize(fixture({'식품코드':'P-test','데이터구분코드':'P','식품중량':'1kg'}));
 assert.equal(packaged.serving_amount,null);
 assert.equal(normalize(fixture({'식품코드':'P-test','데이터구분코드':'P','1회 섭취참고량':'30g'})).serving_amount,30);
});
test('supplements are classified separately and unsupported groups fail closed',()=>{
 assert.equal(normalize(fixture({'식품코드':'F-test','데이터구분코드':'F'})).food_type,'SUPPLEMENT');
 assert.throws(()=>normalize(fixture({'데이터구분코드':'X'})));
});
test('SQL merge preserves known values, fills blanks only on same basis, retains old rows and is idempotent',
 {skip:!process.env.DATABASE_URL},async()=>{
 const c=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:15000});
 await c.connect();
 try{
  await c.query('BEGIN');
  await c.query(`CREATE TEMP TABLE foodsafety_processed_nutrition (LIKE foodsafety_processed_nutrition INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
   ALTER TABLE foodsafety_processed_nutrition ADD PRIMARY KEY(food_code);
   CREATE TEMP TABLE food_reference (LIKE food_reference INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
   ALTER TABLE food_reference ADD PRIMARY KEY(food_code);
   CREATE TEMP TABLE kfind_stage (LIKE foodsafety_processed_nutrition INCLUDING DEFAULTS);
   ALTER TABLE kfind_stage ALTER COLUMN updated_at DROP NOT NULL;
   ALTER TABLE kfind_stage ADD COLUMN reference_basis NUMERIC, ADD COLUMN reference_unit TEXT,
   ADD COLUMN serving_amount NUMERIC, ADD COLUMN serving_unit TEXT, ADD COLUMN brand TEXT,
   ADD COLUMN origin TEXT, ADD COLUMN search_text TEXT`);
  const temporary=(await c.query("SELECT relpersistence FROM pg_class WHERE oid='foodsafety_processed_nutrition'::regclass")).rows[0];
  assert.equal(temporary.relpersistence,'t');
  await c.query(`INSERT INTO foodsafety_processed_nutrition(food_code,item_name,representative_name,basis_amount,calories_kcal,protein_g)
   VALUES ('D-test','existing','existing','100g',999,NULL),('D-volume','volume','volume','100mL',NULL,NULL),('old-only','old','old','100g',123,0)`);
  await c.query(`INSERT INTO food_reference(food_code,name,basis_amount,basis_unit,calories_kcal,protein_g,search_text)
   VALUES ('D-test','existing',100,'g',999,NULL,'existing'),('D-volume','volume',100,'mL',NULL,NULL,'volume')`);
  const rows=[normalize(fixture()),normalize(fixture({'식품코드':'D-volume'})),normalize(fixture({'식품코드':'D-new'}))];
  await c.query('INSERT INTO kfind_stage SELECT * FROM jsonb_populate_recordset(NULL::pg_temp.kfind_stage,$1::jsonb)',[JSON.stringify(rows)]);
  for(const sql of Object.values(mergeStatements))await c.query(sql);
  const result=(await c.query('SELECT food_code,calories_kcal,protein_g FROM foodsafety_processed_nutrition ORDER BY food_code')).rows;
  assert.equal(result.length,4);
  assert.equal(Number(result.find(r=>r.food_code==='D-test').calories_kcal),999);
  assert.equal(Number(result.find(r=>r.food_code==='D-test').protein_g),0);
  assert.equal(result.find(r=>r.food_code==='D-volume').protein_g,null);
  assert.equal(Number(result.find(r=>r.food_code==='old-only').calories_kcal),123);
  const ref=(await c.query("SELECT * FROM food_reference WHERE food_code='D-test'")).rows[0];
  assert.equal(Number(ref.calories_kcal),999);assert.equal(Number(ref.protein_g),0);assert.equal(ref.name,'existing');
  for(const sql of Object.values(mergeStatements))assert.equal((await c.query(sql)).rowCount,0);
 }finally{await c.query('ROLLBACK');await c.end();}
});
