import assert from 'node:assert/strict';
import {test} from 'node:test';
import {getPool} from '../lib/db';
import {clearPlanCatalog,planProducts,sideProducts} from '../lib/shopping-plan-catalog';

test('main and side catalogs share one recipe read, invalidation refreshes it, failures retry',async t=>{
 const previous=process.env.DATABASE_URL;
 process.env.DATABASE_URL??='postgresql://localhost/catalog-cache-test';
 const pool=getPool();
 let reads=0,fail=false;
 t.mock.method(pool,'query',async(sql:string)=>{
  if(sql.includes('recipe_optimizer_results')){reads++;if(fail)throw new Error('temporary failure');}
  return {rows:[]};
 });
 t.after(async()=>{clearPlanCatalog();t.mock.restoreAll();await pool.end();if(previous===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previous;});
 clearPlanCatalog();
 await Promise.all([planProducts(),sideProducts(),planProducts()]);
 assert.equal(reads,1);
 await Promise.all([planProducts(),sideProducts()]);assert.equal(reads,1);
 clearPlanCatalog();await planProducts();assert.equal(reads,2);
 clearPlanCatalog();fail=true;await assert.rejects(planProducts(),/temporary failure/);
 fail=false;await planProducts();assert.equal(reads,4);
});
