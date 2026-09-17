import {createHmac} from 'node:crypto';
import type {PoolClient} from 'pg';

export function comparisonDay(now=new Date()) {
  return new Date(now.getTime()+9*60*60*1000).toISOString().slice(0,10);
}
export function comparisonVisitor(day:string,address:string,secret:string) {
  return createHmac('sha256',secret).update(`comparison:${day}:${address}`).digest('hex');
}
export function comparisonProduct(input:unknown):string|null {
  if(!input||typeof input!=='object'||!('productId' in input))return null;
  const id=input.productId;
  return typeof id==='string'&&id.length>0&&id.length<=200?id:null;
}
// Transaction lock keeps the daily cap effective under concurrent requests.
export async function recordComparison(c:PoolClient,id:string,day:string,visitor:string) {
  await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[visitor]);
  const count=await c.query('SELECT count(*)::int AS n FROM comparison_interest WHERE event_day=$1 AND visitor_hash=$2',[day,visitor]);
  if(count.rows[0].n>=50)return false;
  await c.query(`INSERT INTO comparison_interest(product_id,event_day,visitor_hash)
    SELECT id,$2::date,$3 FROM catalog_items WHERE id=$1 AND market_code='KR' AND currency_code='KRW' AND product_url IS NOT NULL
    ON CONFLICT DO NOTHING`,[id,day,visitor]);
  return true;
}
export const comparisonRankingSql=`SELECT e.product_id,count(*)::int AS comparisons
  FROM comparison_interest e JOIN catalog_items c ON c.id=e.product_id
  WHERE e.event_day BETWEEN $1::date-6 AND $1::date
    AND c.market_code='KR' AND c.currency_code='KRW' AND c.product_url IS NOT NULL
  GROUP BY e.product_id HAVING count(*)>=3 ORDER BY comparisons DESC,e.product_id LIMIT 6`;
