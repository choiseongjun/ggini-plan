import {NextRequest} from 'next/server';
import {adminUser} from '../../../../lib/admin';
import {sameOrigin} from '../../../../lib/auth';
import {getPool} from '../../../../lib/db';
export async function GET(request:NextRequest){
 try{
  if(!await adminUser(request))return Response.json({error:'관리자 로그인이 필요해요.'},{status:403});
  const {rows}=await getPool().query('SELECT id,kind,message,page,status,created_at FROM service_feedback ORDER BY created_at DESC LIMIT 200');
  return Response.json({items:rows},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'의견을 불러오지 못했어요.'},{status:503});}
}
export async function PATCH(request:NextRequest){
 if(!sameOrigin(request))return Response.json({error:'요청 출처를 확인해 주세요.'},{status:403});
 try{
  if(!await adminUser(request))return Response.json({error:'관리자 로그인이 필요해요.'},{status:403});
  const p=await request.json();if(typeof p.id!=='string'||!/^[0-9a-f-]{36}$/i.test(p.id)||!['new','reviewed','done'].includes(p.status))return Response.json({error:'입력을 확인해 주세요.'},{status:400});
  const r=await getPool().query('UPDATE service_feedback SET status=$1 WHERE id=$2',[p.status,p.id]);
  return Response.json({saved:r.rowCount===1});
 }catch{return Response.json({error:'상태를 저장하지 못했어요.'},{status:503});}
}
