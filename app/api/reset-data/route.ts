import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,sameOrigin,authFailure} from '../../../lib/auth';
import {getPool} from '../../../lib/db';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return authFailure('요청을 확인해 주세요.',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  const input=await request.json().catch(()=>null);
  if(input?.confirmation!=='전체 초기화'||input?.userId!==user.id)return authFailure('초기화할 계정과 확인 문구를 확인해 주세요.',400);
  const db=await getPool().connect();
  try{
   await db.query('BEGIN');
   // Keep stock versions advancing so a previously open tab cannot restore old stock.
   for(const scope of ['products','ingredients'])await db.query("INSERT INTO shopping_progress(user_id,scope,stock,version) VALUES($1,$2,'{}',1) ON CONFLICT(user_id,scope) DO UPDATE SET stock='{}',version=shopping_progress.version+1,updated_at=NOW()",[user.id,scope]);
   for(const table of ['user_regions','market_workspaces','food_intake_logs','shopping_expenses','daily_expenses','weekly_budgets','monthly_budgets','meal_ingredient_baskets','monthly_meal_plans','shopping_plans','meal_plans','shopping_preferences','body_profiles','shared_shopping_plans']){
    await db.query(`DELETE FROM ${table} WHERE user_id=$1`,[user.id]);
   }
   // Import receipts remain as replay protection, not as visible user records.
   await db.query('INSERT INTO user_data_resets(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET reset_at=NOW()',[user.id]);
   await db.query('COMMIT');
   return NextResponse.json({reset:true},{headers:{'Cache-Control':'no-store'}});
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 }catch{return authFailure('초기화하지 못했어요. 다시 시도해 주세요.',503);}
}
