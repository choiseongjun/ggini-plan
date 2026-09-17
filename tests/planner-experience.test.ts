import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Pool} from 'pg';
import {randomUUID} from 'node:crypto';
import {initialConditions,purchaseBasket,type PlanProduct} from '../lib/shopping-plan';
import {purchaseSummary,recommendationReasons} from '../lib/plan-explanation';
import {parsePlannerEvent,savePlannerEvent} from '../lib/planner-events';
test('purchase summary charges sale packs, deducts owned stock and groups sellers',()=>{
 const p=(id:string,url:string|null)=>({id,name:id,price:6000,servings:2,productUrl:url} as PlanProduct);
 const products=[p('a','https://www.shop.test/a'),p('b','https://shop.test/b'),p('c',null)];
 const result=purchaseSummary(purchaseBasket(['a','a','a','b','c'],products,[],{a:1}));
 assert.equal(result.total,18000);assert.equal(result.packs,3);assert.equal(result.groups.length,2);assert.equal(result.groups[0].cost,12000);assert.equal(result.unknown,1);
 assert.equal(purchaseSummary(purchaseBasket(['a'],products,['a'])).total,0);
});
test('unknown nutrition never claims calorie or protein fit; events reject invalid payloads',()=>{
 const p={id:'a',name:'a',category:'frozen_meal',caloriesKcal:null,proteinG:null} as PlanProduct;
 assert.ok(recommendationReasons(p,{...initialConditions,goal:'muscle'},600).every(r=>!r.includes('단백질')&&!r.includes('열량')));
 assert.equal(parsePlannerEvent({event:'purchase',visitor:randomUUID()}),null);
 assert.equal(parsePlannerEvent({event:'visit',visitor:'bad'}),null);
 assert.ok(parsePlannerEvent({event:'generated',visitor:randomUUID()}));
});
test('same-day deduplication and return on a later day; all events rolled back',async()=>{
 const pool=new Pool({connectionString:process.env.DATABASE_URL});const c=await pool.connect();
 try{await c.query('BEGIN');const visitor='test-'+randomUUID();
 await savePlannerEvent(c,visitor,'visit','2020-01-01');await savePlannerEvent(c,visitor,'visit','2020-01-01');
 assert.equal((await c.query('SELECT count(*)::int AS n FROM planner_events WHERE visitor_hash=$1',[visitor])).rows[0].n,1);
 await savePlannerEvent(c,visitor,'visit','2020-01-02');await savePlannerEvent(c,visitor,'generated','2020-01-02');
 assert.deepEqual((await c.query('SELECT event FROM planner_events WHERE visitor_hash=$1 AND day=$2 ORDER BY event',[visitor,'2020-01-02'])).rows.map(r=>r.event),['generated','returned','visit']);
 }finally{await c.query('ROLLBACK');c.release();await pool.end();}
});
