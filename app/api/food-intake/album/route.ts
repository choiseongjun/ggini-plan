import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,authFailure} from '../../../../lib/auth';
import {getPool} from '../../../../lib/db';
export const runtime='nodejs';
const validDate=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export async function GET(request:NextRequest){
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  const before=request.nextUrl.searchParams.get('before');
  if(before&&!validDate(before))return authFailure('날짜를 확인해 주세요.',400);
  // Page by complete KST days, keeping every meal on the boundary day together.
  const result=await getPool().query(`WITH recent_days AS (
   SELECT DISTINCT (COALESCE(eaten_at,created_at) AT TIME ZONE 'Asia/Seoul')::date AS day
   FROM food_intake_logs WHERE user_id=$1 AND undone_at IS NULL
   AND ($2::date IS NULL OR (COALESCE(eaten_at,created_at) AT TIME ZONE 'Asia/Seoul')::date<$2::date)
   ORDER BY day DESC LIMIT 31
  ) SELECT l.id::text,l.product_name AS name,l.meal_slot AS "mealSlot",
   COALESCE(l.eaten_at,l.created_at) AS "eatenAt",to_char(d.day,'YYYY-MM-DD') AS date,
   (SELECT count(*)::int FROM food_intake_photos p WHERE p.user_id=l.user_id AND p.log_id=l.id) AS "photoCount"
   FROM recent_days d JOIN food_intake_logs l ON (COALESCE(l.eaten_at,l.created_at) AT TIME ZONE 'Asia/Seoul')::date=d.day
   WHERE l.user_id=$1 AND l.undone_at IS NULL
   ORDER BY d.day DESC,COALESCE(l.eaten_at,l.created_at) DESC,l.id DESC`,[user.id,before]);
  const days=[...new Set(result.rows.map(row=>row.date as string))];
  return NextResponse.json({logs:result.rows.filter(row=>row.date!==days[30]),nextCursor:days.length>30?days[29]:null},{headers:{'Cache-Control':'no-store'}});
 }catch{return authFailure('식사 모음을 불러오지 못했어요.',503);}
}
