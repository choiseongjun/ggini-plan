import {NextRequest} from 'next/server';
import {adminUser} from '../../../../lib/admin';
import {getPool} from '../../../../lib/db';
import {comparisonDay} from '../../../../lib/comparison-interest';
export async function GET(request:NextRequest){
 try{if(!await adminUser(request))return Response.json({error:'관리자 로그인이 필요해요.'},{status:403});
 const {rows}=await getPool().query(`SELECT day::text,event,count(*)::int AS visitors FROM planner_events WHERE day BETWEEN $1::date-29 AND $1::date GROUP BY day,event ORDER BY day DESC,event`,[comparisonDay()]);
 // 1순위 목표: 한 주(7일) 동안 3일 이상 '먹었어요'를 기록한 회원. 최근 4주를 7일 단위로 끊어 본다(0 = 오늘까지 7일).
 const habit=(await getPool().query(`WITH days AS (
   SELECT user_id,(created_at AT TIME ZONE 'Asia/Seoul')::date AS d FROM food_intake_logs
   WHERE undone_at IS NULL AND created_at>NOW()-INTERVAL '30 days' GROUP BY 1,2),
  weeks AS (SELECT user_id,(($1::date-d)/7)::int AS week,count(*)::int AS n FROM days WHERE d>$1::date-28 AND d<=$1::date GROUP BY 1,2)
  SELECT week,count(*)::int AS active,count(*) FILTER (WHERE n>=3)::int AS habit FROM weeks GROUP BY week ORDER BY week`,[comparisonDay()])).rows;
 const members=(await getPool().query('SELECT count(*)::int AS n FROM users')).rows[0].n;
 return Response.json({rows,habit,members,today:comparisonDay()},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'이용 통계를 불러오지 못했어요.'},{status:503});}
}
