import {getPool} from '../../../lib/db';
export const runtime='nodejs';
export async function GET(){
 try{
  const result=await getPool().query(`SELECT m.code,m.name,m.currency_code AS currency,c.minor_units AS "minorUnits",m.default_locale AS "defaultLocale",m.time_zone AS "timeZone",m.status,ARRAY(SELECT locale_code FROM market_locales WHERE market_code=m.code ORDER BY locale_code) AS locales FROM markets m JOIN currencies c ON c.code=m.currency_code WHERE m.status<>'disabled' ORDER BY m.code`);
  return Response.json({markets:result.rows,legacyUiMarket:'KR'},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'판매처 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'},{status:503});}
}
