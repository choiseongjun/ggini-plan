import {getPool} from './db';
import type {PriceContext,RegionalPrice} from './regional-price-recommendations';
let cached:{until:number;rows:RegionalPrice[]}|undefined;
export async function regionalPriceContext(region:unknown):Promise<PriceContext|undefined>{
 if(typeof region!=='string'||region.length>20||!region)return undefined;
 try{
  if(!cached||cached.until<Date.now()){
   let timer:ReturnType<typeof setTimeout>|undefined;
   const result=await Promise.race([getPool().query("SELECT payload FROM regional_price_snapshots WHERE source='kamis' AND survey_date>=CURRENT_DATE-7"),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Price lookup timed out')),2000);})]).finally(()=>clearTimeout(timer));
   cached={until:Date.now()+300000,rows:result.rows[0]?.payload??[]};
   if(!cached.rows.length)console.warn('Regional price lookup: no fresh snapshot');
  }
  const rows=cached.rows.filter(r=>r.region===region);
  if(!rows.length)return undefined;
  return {region,rows,today:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date())};
 }catch(error){console.warn('Regional price lookup unavailable',error&&typeof error==='object'&&'code' in error?String(error.code):'timeout-or-connection');return undefined;}
}
