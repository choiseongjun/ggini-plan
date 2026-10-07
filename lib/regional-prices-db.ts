import {getPool} from './db';
import type {PriceContext,RegionalPrice} from './regional-price-recommendations';
import {applyMarketPrices} from './market-ingredient-prices';
import type {PlanProduct} from './shopping-plan';
let cached:{until:number;rows:RegionalPrice[]}|undefined;
// A failed lookup is remembered briefly so every catalog read does not wait for the timeout again.
let failedUntil=0;
async function kamisRows():Promise<RegionalPrice[]>{
 if(cached&&cached.until>=Date.now())return cached.rows;
 if(failedUntil>Date.now())return [];
 try{
  let timer:ReturnType<typeof setTimeout>|undefined;
  const result=await Promise.race([getPool().query("SELECT payload FROM regional_price_snapshots WHERE source='kamis' AND survey_date>=CURRENT_DATE-7"),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Price lookup timed out')),2000);})]).finally(()=>clearTimeout(timer));
  cached={until:Date.now()+300000,rows:result.rows[0]?.payload??[]};
  if(!cached.rows.length)console.warn('Regional price lookup: no fresh snapshot');
  return cached.rows;
 }catch(error){failedUntil=Date.now()+60000;console.warn('Regional price lookup unavailable',error&&typeof error==='object'&&'code' in error?String(error.code):'timeout-or-connection');return [];}
}
export async function regionalPriceContext(region:unknown):Promise<PriceContext|undefined>{
 if(typeof region!=='string'||region.length>20||!region)return undefined;
 const rows=(await kamisRows()).filter(r=>r.region===region);
 if(!rows.length)return undefined;
 return {region,rows,today:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date())};
}

// 재료비는 전국 평균 시세로 다시 매긴다(지역 선택과 무관하게 같은 금액). 시세가 없으면 기존 추정값 그대로.
export const MARKET_PRICE_REGION='전국';
let lastPriced:{products:PlanProduct[];rows:RegionalPrice[];result:PlanProduct[]}|undefined;
export async function withMarketPrices(products:PlanProduct[]):Promise<PlanProduct[]>{
 const all=await kamisRows();
 if(lastPriced?.products===products&&lastPriced.rows===all)return lastPriced.result;
 const result=applyMarketPrices(products,all.filter(r=>r.region===MARKET_PRICE_REGION));
 lastPriced={products,rows:all,result};
 return result;
}
