import {NextRequest} from 'next/server';
import {getPool} from '../../../lib/db';
import {comparisonDay,comparisonVisitor} from '../../../lib/comparison-interest';
import {parsePlannerEvent,plannerVisitor,savePlannerEvent} from '../../../lib/planner-events';
export async function POST(request:NextRequest){
 if(request.headers.get('origin')!==new URL(request.url).origin)return new Response(null,{status:403});
 try{
  const raw=await request.text();if(raw.length>1000)return new Response(null,{status:413});
  let input;try{input=parsePlannerEvent(JSON.parse(raw));}catch{return new Response(null,{status:400});}if(!input)return new Response(null,{status:400});
  if(process.env.VERCEL_ENV!=='production')return new Response(null,{status:204});
  const day=comparisonDay(),secret=process.env.DATABASE_URL!,visitor=plannerVisitor(input.visitor,secret);
  const address=request.headers.get('x-vercel-forwarded-for');if(!address)return new Response(null,{status:204});
  const gate=comparisonVisitor(day,address,secret),c=await getPool().connect();
  try{
   await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[gate]);
   const limit=await c.query('INSERT INTO planner_event_limits(day,network_hash,requests) VALUES($1,$2,1) ON CONFLICT(day,network_hash) DO UPDATE SET requests=LEAST(planner_event_limits.requests+1,501) RETURNING requests',[day,gate]);
   if(limit.rows[0].requests>500){await c.query('COMMIT');return new Response(null,{status:429});}
   await c.query('DELETE FROM planner_event_limits WHERE day<$1::date',[day]);
   await savePlannerEvent(c,visitor,input.event,day);await c.query('COMMIT');
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  return new Response(null,{status:204});
 }catch{return new Response(null,{status:503});}
}
