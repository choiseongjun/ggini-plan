import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,sameOrigin,authFailure} from '../../../lib/auth';
import {getPool} from '../../../lib/db';
import {validPlanDate} from '../../../lib/daily-plan';
import {pantryToday} from '../../../lib/pantry-inventory';
import {parseWellnessInput} from '../../../lib/wellness-input';
export const runtime='nodejs';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:NextRequest){
 try{const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
 const date=request.nextUrl.searchParams.get('date')??pantryToday();if(!validPlanDate(date)||date>pantryToday())return authFailure('날짜를 확인해 주세요.',400);
 // One statement provides a consistent snapshot of version and records.
 const r=await getPool().query(`SELECT
 (SELECT row_to_json(s) FROM (SELECT water_enabled AS "waterEnabled",weight_enabled AS "weightEnabled",cup_ml AS "cupMl",goal_ml AS "goalMl",version FROM wellness_settings WHERE user_id=$1) s) AS settings,
 COALESCE((SELECT json_agg(w) FROM (SELECT id,ml FROM wellness_water WHERE user_id=$1 AND day=$2::date ORDER BY created_at,id) w),'[]') AS water,
 COALESCE((SELECT json_agg(w) FROM (SELECT to_char(day,'YYYY-MM-DD') AS day,kg::float8 AS kg FROM wellness_weight WHERE user_id=$1 AND day BETWEEN $2::date-29 AND $2::date ORDER BY day) w),'[]') AS weights`,[user.id,date]);
 return json({date,...r.rows[0],settings:r.rows[0].settings??{waterEnabled:true,weightEnabled:true,cupMl:200,goalMl:null,version:0}});
 }catch{return authFailure('건강 기록을 불러오지 못했어요.',503);}
}
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
 const raw=await request.text();if(raw.length>2000)return authFailure('입력을 확인해 주세요.',400);
 let input;try{input=parseWellnessInput(JSON.parse(raw));}catch{return authFailure('입력을 확인해 주세요.',400);}if(!input)return authFailure('날짜·용량·체중을 확인해 주세요.',400);
 const db=await getPool().connect();try{
 await db.query('BEGIN');await db.query('INSERT INTO wellness_settings(user_id) VALUES($1) ON CONFLICT DO NOTHING',[user.id]);
 const s=(await db.query('SELECT version,request_id FROM wellness_settings WHERE user_id=$1 FOR UPDATE',[user.id])).rows[0];
 if(s.request_id===input.requestId){await db.query('COMMIT');return json({saved:true});}
 if(s.version!==input.version){await db.query('ROLLBACK');return json({error:'다른 화면에서 기록이 바뀌었어요. 새 기록을 확인한 뒤 다시 눌러주세요.'},409);}
 if(input.action==='water')await db.query('INSERT INTO wellness_water(user_id,id,day,ml) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[user.id,input.requestId,input.date,input.ml]);
 if(input.action==='undoWater')await db.query('DELETE FROM wellness_water WHERE user_id=$1 AND id=$2 AND day=$3',[user.id,input.id,input.date]);
 if(input.action==='weight'){
 if(input.kg===null)await db.query('DELETE FROM wellness_weight WHERE user_id=$1 AND day=$2',[user.id,input.date]);
 else await db.query('INSERT INTO wellness_weight(user_id,day,kg) VALUES($1,$2,$3) ON CONFLICT(user_id,day) DO UPDATE SET kg=EXCLUDED.kg',[user.id,input.date,input.kg]);}
 if(input.action==='settings')await db.query('UPDATE wellness_settings SET water_enabled=$2,weight_enabled=$3,cup_ml=$4,goal_ml=$5 WHERE user_id=$1',[user.id,input.waterEnabled,input.weightEnabled,input.cupMl,input.goalMl]);
 await db.query('UPDATE wellness_settings SET version=version+1,request_id=$2 WHERE user_id=$1',[user.id,input.requestId]);await db.query('COMMIT');return json({saved:true});
 }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }catch{return authFailure('저장 결과를 확인하지 못했어요. 다시 시도해 주세요.',503);}
}
