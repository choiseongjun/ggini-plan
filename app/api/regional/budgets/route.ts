import {NextRequest,NextResponse} from 'next/server';
import {sessionUser,sameOrigin,authFailure} from '../../../../lib/auth';
import {getPool} from '../../../../lib/db';
import {marketContext,RegionError} from '../../../../lib/regional-db';
import {validPlanDate} from '../../../../lib/daily-plan';
export const runtime='nodejs';
const periods={week:{table:'weekly_budgets',column:'week_start'},month:{table:'monthly_budgets',column:'month_start'}} as const;
function validPeriod(period:unknown,start:unknown):period is keyof typeof periods{
 return typeof period==='string'&&Object.hasOwn(periods,period)&&validPlanDate(start)&&(period==='month'?start.endsWith('-01'):new Date(`${start}T00:00:00Z`).getUTCDay()===1);
}
export async function GET(request:NextRequest){
 try{
  const user=await sessionUser(request);if(!user)return authFailure('Login required',401);
  const q=request.nextUrl.searchParams,period=q.get('period'),start=q.get('start');
  if(!validPeriod(period,start))return authFailure('Period must begin on Monday or the first day of the month',400);
  const region=await marketContext(q.get('market')??'KR'),spec=periods[period];
  const row=(await getPool().query(`SELECT amount AS "amountMinor" FROM ${spec.table} WHERE user_id=$1 AND market_code=$2 AND currency_code=$3 AND ${spec.column}=$4::date`,[user.id,region.market,region.currency,start])).rows[0];
  return NextResponse.json({region,period,start,amountMinor:row?.amountMinor??null},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return authFailure(e instanceof RegionError?e.message:'Budget unavailable',e instanceof RegionError?400:503);}
}
export async function PUT(request:NextRequest){
 if(!sameOrigin(request))return authFailure('Invalid origin',403);
 try{
  const user=await sessionUser(request);if(!user)return authFailure('Login required',401);
  const p=await request.json().catch(()=>null);
  if(!p||!validPeriod(p.period,p.start)||typeof p.market!=='string'||typeof p.currency!=='string'||!Number.isSafeInteger(p.amountMinor)||p.amountMinor<1||p.amountMinor>10000000)return authFailure('Invalid budget',400);
  const region=await marketContext(p.market);if(p.currency!==region.currency)return authFailure('Currency does not match market',400);
  const spec=periods[p.period as keyof typeof periods];
  await getPool().query(`INSERT INTO ${spec.table}(user_id,market_code,currency_code,${spec.column},amount) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,market_code,currency_code,${spec.column}) DO UPDATE SET amount=EXCLUDED.amount`,[user.id,region.market,region.currency,p.start,p.amountMinor]);
  return NextResponse.json({saved:true,region},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return authFailure(e instanceof RegionError?e.message:'Budget save failed',e instanceof RegionError?400:503);}
}
