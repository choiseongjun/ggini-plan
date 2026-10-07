import {getPool} from './db';
import type {PriceContext,RegionalPrice} from './regional-price-recommendations';
import {applyMarketPrices} from './market-ingredient-prices';
import {offerPattern} from './nearby-marts';
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

// 매장 이름 비교 키: 공백·(주)·주식회사를 빼고 소문자로(lib/nearby-marts storeKey와 같은 규칙).
const STORE_KEY_SQL="lower(regexp_replace(o->>'store','\\(주\\)|주식회사|\\s','','g'))";
// 참가격 조사 매장 가격 중 찾은 마트·메뉴 재료에 맞는 것만 DB 안에서 골라 온다(스냅숏 전체는 2.5MB).
// 조사 매장인지도 함께 돌려준다 — 조사 매장이어도 이 메뉴 재료가 조사 품목에 없을 수 있다.
export async function surveyedOffers(storeKeys:string[],keywords:string[]){
 if(!storeKeys.length)return {stores:new Set<string>(),rows:[]};
 let timer:ReturnType<typeof setTimeout>|undefined;
 const result=await Promise.race([getPool().query<{store:string;product:string|null;price:number|null;date:string|null}>(`WITH offers AS MATERIALIZED (
   SELECT ${STORE_KEY_SQL} AS store,p->>'name' AS product,(o->>'price')::float8 AS price,o->>'date' AS date
   FROM regional_price_snapshots s,jsonb_array_elements(s.payload) p,jsonb_array_elements(p->'offers') o
   WHERE s.source='tprice' AND ${STORE_KEY_SQL}=ANY($1::text[]))
  (SELECT store,product,price,date FROM offers WHERE product ~ ANY($2::text[]) ORDER BY 1,3 LIMIT 300)
  UNION ALL SELECT DISTINCT store,NULL::text,NULL::float8,NULL::text FROM offers`,[storeKeys,keywords.map(offerPattern)]),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Offer lookup timed out')),4000);})]).finally(()=>clearTimeout(timer));
 return {stores:new Set(result.rows.map(r=>r.store)),rows:result.rows.flatMap(r=>r.product!==null&&r.price!==null&&r.date!==null?[{store:r.store,product:r.product,price:r.price,date:r.date}]:[])};
}
