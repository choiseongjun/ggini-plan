import {getPool} from './db';
import type {PriceContext,RegionalPrice} from './regional-price-recommendations';
import {applyMarketPrices} from './market-ingredient-prices';
import type {PlanProduct} from './shopping-plan';

// Functions run far from the database, so read one region's rows (~60KB) instead of the whole
// 1.2MB snapshot. Each region is cached for five minutes; a failed lookup is remembered for a
// minute so catalog reads do not wait on the timeout again, and concurrent reads share one query.
type Entry={until:number;rows:RegionalPrice[]}|{until:number;pending:Promise<RegionalPrice[]>};
const cache=new Map<string,Entry>();
const TTL=300000,RETRY=60000,TIMEOUT=2500;
async function query(region:string):Promise<RegionalPrice[]>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 const result=await Promise.race([getPool().query<{row:RegionalPrice}>("SELECT e AS row FROM regional_price_snapshots s,jsonb_array_elements(s.payload) e WHERE s.source='kamis' AND s.survey_date>=CURRENT_DATE-7 AND e->>'region'=$1",[region]),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Price lookup timed out')),TIMEOUT);})]).finally(()=>clearTimeout(timer));
 return result.rows.map(r=>r.row);
}
async function kamisRows(region:string):Promise<RegionalPrice[]>{
 const entry=cache.get(region);
 if(entry&&entry.until>=Date.now())return 'rows' in entry?entry.rows:entry.pending;
 const pending=query(region).then(rows=>{
  if(!rows.length)console.warn('Regional price lookup: no fresh snapshot',region);
  cache.set(region,{until:Date.now()+TTL,rows});return rows;
 },error=>{
  console.warn('Regional price lookup unavailable',error&&typeof error==='object'&&'code' in error?String(error.code):'timeout-or-connection');
  cache.set(region,{until:Date.now()+RETRY,rows:[]});return [] as RegionalPrice[];
 });
 cache.set(region,{until:Date.now()+TIMEOUT+1000,pending});
 return pending;
}
export async function regionalPriceContext(region:unknown):Promise<PriceContext|undefined>{
 if(typeof region!=='string'||region.length>20||!region)return undefined;
 const rows=await kamisRows(region);
 if(!rows.length)return undefined;
 return {region,rows,today:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date())};
}

// 재료비는 전국 평균 시세로 다시 매긴다(지역 선택과 무관하게 같은 금액). 시세가 없으면 기존 추정값 그대로.
export const MARKET_PRICE_REGION='전국';
let lastPriced:{products:PlanProduct[];rows:RegionalPrice[];result:PlanProduct[]}|undefined;
export async function withMarketPrices(products:PlanProduct[]):Promise<PlanProduct[]>{
 const rows=await kamisRows(MARKET_PRICE_REGION);
 if(lastPriced?.products===products&&lastPriced.rows===rows)return lastPriced.result;
 const result=applyMarketPrices(products,rows);
 lastPriced={products,rows,result};
 return result;
}
