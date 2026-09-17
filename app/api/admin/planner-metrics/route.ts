import {NextRequest} from 'next/server';
import {adminUser} from '../../../../lib/admin';
import {getPool} from '../../../../lib/db';
import {comparisonDay} from '../../../../lib/comparison-interest';
export async function GET(request:NextRequest){
 try{if(!await adminUser(request))return Response.json({error:'관리자 로그인이 필요해요.'},{status:403});
 const {rows}=await getPool().query(`SELECT day::text,event,count(*)::int AS visitors FROM planner_events WHERE day BETWEEN $1::date-29 AND $1::date GROUP BY day,event ORDER BY day DESC,event`,[comparisonDay()]);
 return Response.json({rows},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'이용 통계를 불러오지 못했어요.'},{status:503});}
}
