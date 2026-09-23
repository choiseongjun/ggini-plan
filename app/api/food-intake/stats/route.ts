import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,authFailure} from '../../../../lib/auth';
import {getPool} from '../../../../lib/db';
import {calorieEstimate,parseBodyProfile} from '../../../../lib/body-profile';
import {dailyNutritionReference} from '../../../../lib/daily-nutrition-reference';
import {emptyDashboard} from '../../../../lib/dashboard';
import {intakeStats} from '../../../../lib/intake-stats';
import {parseNutritionTarget} from '../../../../lib/nutrition-target';
export const runtime='nodejs';

// Streak, badges and the weekly report — all derived from the intake log, nothing extra stored.
export async function GET(request:NextRequest){
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인하면 기록 현황을 볼 수 있어요.',401);
  const [logs,profile]=await Promise.all([
   getPool().query(`SELECT product_id AS "productId",product_name AS name,calories::float8,protein::float8,cost::float8,to_char(created_at AT TIME ZONE 'Asia/Seoul','YYYY-MM-DD') AS date FROM food_intake_logs WHERE user_id=$1 AND undone_at IS NULL AND created_at>=NOW()-INTERVAL '400 days'`,[user.id]),
   getPool().query('SELECT height::float8,weight::float8,age,sex,activity,meals,pregnancy,nutrition_target FROM body_profiles WHERE user_id=$1',[user.id]),
  ]);
  const row=profile.rows[0],body=parseBodyProfile(row),target=parseNutritionTarget(row?.nutrition_target);
  const goals={
   calories:target?.calories??(body?calorieEstimate(body)?.daily??null:null),
   protein:target?Math.round(target.calories*target.proteinRatio/400):dailyNutritionReference(row)?.protein??null,
  };
  return NextResponse.json({...intakeStats(logs.rows,emptyDashboard().today,goals),goals},{headers:{'Cache-Control':'no-store'}});
 }catch{return authFailure('기록 현황을 불러오지 못했어요.',503);}
}
