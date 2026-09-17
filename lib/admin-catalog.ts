import {catalogItems} from './catalog-db';
import {getPool} from './db';
import type {MarketContext} from './regional';

// Admin sees every market, while public catalog callers still default to Korea.
export async function adminCatalog(){
 const {rows:regions}=await getPool().query<MarketContext & {name:string}>(`SELECT m.code AS market,m.name,m.currency_code AS currency,c.minor_units AS "minorUnits",m.default_locale AS locale,m.time_zone AS "timeZone",m.status FROM markets m JOIN currencies c ON c.code=m.currency_code ORDER BY m.code`);
 const items=(await Promise.all(regions.map(region=>catalogItems(region)))).flat();
 return {items,regions};
}
