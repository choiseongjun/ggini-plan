import {NextRequest} from 'next/server';
import {createHash} from 'node:crypto';
import {sameOrigin} from '../../../lib/auth';
import {getPool} from '../../../lib/db';
import {parseFeedback} from '../../../lib/service-feedback';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return Response.json({error:'요청 출처를 확인해 주세요.'},{status:403});
 try{
  const raw=await request.text();if(raw.length>8000)return Response.json({error:'내용이 너무 길어요.'},{status:413});
  let input;try{input=parseFeedback(JSON.parse(raw));}catch{/* Invalid JSON. */}
  if(!input)return Response.json({error:'유형과 의견을 확인해 주세요. 최대 1,000자까지 보낼 수 있어요.'},{status:400});
  const address=process.env.VERCEL?request.headers.get('x-vercel-forwarded-for')??request.headers.get('x-forwarded-for')??'unknown':'local';
  const hash=createHash('sha256').update(`${new Date().toISOString().slice(0,10)}:${address}`).digest('hex');
  const c=await getPool().connect();
  try{
   await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[hash]);
   const previous=(await c.query('SELECT sender_hash,kind,message,page FROM service_feedback WHERE id=$1',[input.id])).rows[0];
   if(previous){await c.query('ROLLBACK');return previous.sender_hash===hash&&previous.kind===input.kind&&previous.message===input.message&&previous.page===input.page?Response.json({saved:true}):Response.json({error:'새 의견으로 다시 보내주세요.'},{status:409});}
   const count=(await c.query("SELECT count(*)::int AS n FROM service_feedback WHERE sender_hash=$1 AND created_at>now()-interval '1 day'",[hash])).rows[0].n;
   if(count>=5){await c.query('ROLLBACK');return Response.json({error:'오늘은 의견을 충분히 보내주셨어요. 내일 다시 보내주세요.'},{status:429});}
   await c.query('INSERT INTO service_feedback(id,kind,message,page,sender_hash) VALUES($1,$2,$3,$4,$5)',[input.id,input.kind,input.message,input.page,hash]);
   await c.query('COMMIT');return Response.json({saved:true},{status:201});
  }catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
 }catch{return Response.json({error:'저장하지 못했어요. 잠시 후 다시 보내주세요.'},{status:503});}
}
