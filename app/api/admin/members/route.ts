import {NextRequest,NextResponse} from 'next/server';
import {adminUser} from '../../../../lib/admin';
import {getPool} from '../../../../lib/db';
export const runtime='nodejs';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:NextRequest){
 try{
  if(!await adminUser(request))return json({error:'관리자 로그인이 필요합니다.'},403);
  const before=request.nextUrl.searchParams.get('before');
  if(before!==null&&!/^[1-9]\d{0,17}$/.test(before))return json({error:'페이지를 확인해 주세요.'},400);
  const {rows}=await getPool().query(`SELECT id::text,name,email,created_at,last_login_at FROM users
   WHERE ($1::bigint IS NULL OR id<$1::bigint) ORDER BY id DESC LIMIT 51`,[before]);
  const members=rows.slice(0,50);
  return json({members,next:rows.length>50?members.at(-1)?.id:null});
 }catch{return json({error:'회원 로그인 기록을 불러오지 못했어요.'},503);}
}
