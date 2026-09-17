import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Pool} from 'pg';
import {comparisonDay,comparisonProduct,comparisonVisitor,recordComparison,comparisonRankingSql} from '../lib/comparison-interest';

test('Korean day boundary, rotating anonymous key and input validation',()=>{
 assert.equal(comparisonDay(new Date('2026-09-18T14:59:59Z')),'2026-09-18');
 assert.equal(comparisonDay(new Date('2026-09-18T15:00:00Z')),'2026-09-19');
 assert.notEqual(comparisonVisitor('2026-09-18','a','secret'),comparisonVisitor('2026-09-19','a','secret'));
 assert.equal(comparisonProduct({productId:'rice'}),'rice');
 assert.equal(comparisonProduct({productId:42}),null);
 assert.equal(comparisonProduct(null),null);
});

test('database deduplicates, enforces threshold, excludes Taiwan and old events',async()=>{
 const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1});
 const c=await pool.connect();
 try{
  await c.query('BEGIN');
  const kr=(await c.query("SELECT id FROM catalog_items WHERE market_code='KR' AND product_url IS NOT NULL ORDER BY id LIMIT 2")).rows;
  const tw=(await c.query("SELECT id FROM catalog_items WHERE market_code='TW' LIMIT 1")).rows[0];
  assert.equal(kr.length,2);assert.ok(tw);
  const day='2099-01-10';
  for(const visitor of ['test-a','test-b','test-c'])await recordComparison(c,kr[0].id,day,visitor);
  await recordComparison(c,kr[0].id,day,'test-a');
  await recordComparison(c,kr[1].id,day,'test-a');
  await recordComparison(c,tw.id,day,'test-a');
  await recordComparison(c,'non-existent-test-product',day,'test-a');
  for(const visitor of ['test-a','test-b','test-c'])await recordComparison(c,kr[1].id,'2099-01-03',visitor);
  const rows=(await c.query(comparisonRankingSql,[day])).rows;
  assert.deepEqual(rows,[{product_id:kr[0].id,comparisons:3}]);
  assert.equal((await c.query('SELECT count(*)::int AS n FROM comparison_interest WHERE product_id=$1 AND event_day=$2',[tw.id,day])).rows[0].n,0);
  await c.query("INSERT INTO comparison_interest(product_id,event_day,visitor_hash) SELECT id,$1,'test-cap' FROM catalog_items WHERE market_code='KR' AND product_url IS NOT NULL LIMIT 50",[day]);
  assert.equal(await recordComparison(c,kr[0].id,day,'test-cap'),false);
 }finally{await c.query('ROLLBACK');c.release();await pool.end();}
});
