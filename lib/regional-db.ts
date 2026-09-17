import {getPool} from './db';
import {type MarketContext,validTimeZone} from './regional';
export class RegionError extends Error{}
export async function marketContext(market='KR',locale?:string):Promise<MarketContext>{
 if(!/^[A-Z]{2}$/.test(market))throw new RegionError('Invalid market code');
 const row=(await getPool().query(`SELECT m.code AS market,m.currency_code AS currency,c.minor_units AS "minorUnits",m.default_locale AS locale,m.time_zone AS "timeZone",m.status FROM markets m JOIN currencies c ON c.code=m.currency_code WHERE m.code=$1`,[market])).rows[0] as MarketContext|undefined;
 if(!row||row.status==='disabled')throw new RegionError('Unsupported market');
 if(locale){
  if(!(await getPool().query('SELECT 1 FROM market_locales WHERE market_code=$1 AND locale_code=$2',[market,locale])).rowCount)throw new RegionError('Unsupported locale for market');
  row.locale=locale;
 }
 if(!validTimeZone(row.timeZone))throw new RegionError('Invalid market time zone');
 return row;
}
export async function userRegion(userId:string){
 const saved=(await getPool().query('SELECT market_code,locale_code,time_zone FROM user_regions WHERE user_id=$1',[userId])).rows[0];
 const context=await marketContext(saved?.market_code??'KR',saved?.locale_code);
 if(saved&&validTimeZone(saved.time_zone))context.timeZone=saved.time_zone;
 return context;
}
