import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,sameOrigin,authFailure} from '../../../../lib/auth';
import {getPool} from '../../../../lib/db';
import {marketContext,userRegion,RegionError} from '../../../../lib/regional-db';
import {localDate} from '../../../../lib/regional';
import {validPlanDate} from '../../../../lib/daily-plan';
import {expenseCategories} from '../../../../lib/dashboard';
export const runtime='nodejs';
const json=(data:unknown)=>NextResponse.json(data,{headers:{'Cache-Control':'no-store'}});
export async function GET(request:NextRequest){
 try{
  const user=await sessionUser(request);if(!user)return authFailure('Login required',401);
  const q=request.nextUrl.searchParams;
  const region=q.has('market')?await marketContext(q.get('market')!,q.get('locale')??undefined):await userRegion(user.id);
  const from=q.get('from')??localDate(region.timeZone),to=q.get('to')??from;
  if(!validPlanDate(from)||!validPlanDate(to)||from>to||Date.parse(to)-Date.parse(from)>366*86400000)return authFailure('Use a date range of up to 366 days',400);
  const result=await getPool().query(`SELECT to_char(spent_on,'YYYY-MM-DD') AS date,category,amount AS "amountMinor" FROM daily_expenses WHERE user_id=$1 AND market_code=$2 AND currency_code=$3 AND spent_on BETWEEN $4::date AND $5::date ORDER BY spent_on,category`,[user.id,region.market,region.currency,from,to]);
  return json({region,from,to,entries:result.rows,totalMinor:result.rows.reduce((sum,r)=>sum+r.amountMinor,0)});
 }catch(e){return authFailure(e instanceof RegionError?e.message:'Expenses unavailable',e instanceof RegionError?400:503);}
}
export async function PUT(request:NextRequest){
 if(!sameOrigin(request))return authFailure('Invalid origin',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('Login required',401);
  const p=await request.json().catch(()=>null);
  if(!p||typeof p.market!=='string'||typeof p.currency!=='string'||!validPlanDate(p.date)||typeof p.category!=='string'||!Object.hasOwn(expenseCategories,p.category)||!Number.isSafeInteger(p.amountMinor)||p.amountMinor<0||p.amountMinor>10000000)return authFailure('Invalid expense',400);
  const region=await marketContext(p.market);
  if(p.currency!==region.currency)return authFailure('Currency does not match market; conversion is not automatic',400);
  await getPool().query(`INSERT INTO daily_expenses(user_id,market_code,currency_code,spent_on,category,amount) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(user_id,market_code,currency_code,spent_on,category) DO UPDATE SET amount=EXCLUDED.amount,updated_at=NOW()`,[user.id,region.market,region.currency,p.date,p.category,p.amountMinor]);
  return json({saved:true,region,date:p.date,amountMinor:p.amountMinor});
 }catch(e){return authFailure(e instanceof RegionError?e.message:'Expense save failed',e instanceof RegionError?400:503);}
}
