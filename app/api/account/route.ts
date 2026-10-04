import {NextRequest,NextResponse} from 'next/server';
import {compare} from 'bcryptjs';
import {sessionUser,authFailure,SESSION_COOKIE} from '../../../lib/auth';
import {appOrigin} from '../../../lib/google-auth';
import {firebaseAdminAuth,firebaseGoogleIdentity,firebaseAppleIdentity,deleteFirebaseIdentity} from '../../../lib/firebase-server';
import {getPool} from '../../../lib/db';
import {deleteAccount} from '../../../lib/delete-account';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:NextRequest){
 try{
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  const oauth=await oauthAccount(user.id);
  return NextResponse.json({user,method:oauth?.provider??'password'},{headers:{'Cache-Control':'no-store'}});
 }catch{return authFailure('계정 정보를 확인하지 못했어요.',503);}
}
export async function DELETE(request:NextRequest){
 try{
  if(request.headers.get('origin')!==appOrigin())return authFailure('요청을 확인해 주세요.',403);
  const user=await sessionUser(request);if(!user)return authFailure('로그인이 필요해요.',401);
  const input=await request.json().catch(()=>null);
  if(input?.confirmation!=='회원 탈퇴'||input?.userId!==user.id)return authFailure('계정과 확인 문구를 확인해 주세요.',400);
  const oauth=await oauthAccount(user.id);
  let removeIdentity=async()=>{};
  if(oauth){
   const label=oauth.provider==='apple'?'Apple':'구글';
   let idToken:string|undefined;
   // Inside the iOS app a provider popup cannot open, so the signed-in session plus the
   // typed confirmation is enough there. A browser re-authentication token is still verified when sent.
   if(input.idToken!==undefined&&input.idToken!==null){
    if(typeof input.idToken!=='string'||input.idToken.length>16384)return authFailure(`${label}로 본인 확인을 다시 해주세요.`,401);
    let identity;
    try{const token=await firebaseAdminAuth().verifyIdToken(input.idToken);identity=oauth.provider==='apple'?firebaseAppleIdentity(token):firebaseGoogleIdentity(token);}catch{return authFailure(`${label} 본인 확인이 만료됐어요.`,401);}
    if(identity.subject!==oauth.provider_subject)return authFailure(`탈퇴할 계정과 같은 ${label} 계정을 선택해 주세요.`,403);
    idToken=input.idToken;
   }
   removeIdentity=async()=>{
    if(await deleteFirebaseIdentity(oauth.provider,oauth.provider_subject))return;
    const key=process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if(!idToken||!key)return;
    const result=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken}),signal:AbortSignal.timeout(15000)});
    if(!result.ok)throw new Error(`${label} 인증 정보 삭제에 실패했어요. 다시 본인 확인해 주세요.`);
   };
  }else{
   if(typeof input.password!=='string'||input.password.length>200)return authFailure('비밀번호를 확인해 주세요.',401);
   const account=(await getPool().query('SELECT password_hash FROM users WHERE id=$1',[user.id])).rows[0];
   if(!account?.password_hash||!await compare(input.password,account.password_hash))return authFailure('비밀번호가 일치하지 않아요.',401);
  }
  await deleteAccount(user.id,removeIdentity);
  const response=NextResponse.json({deleted:true},{headers:{'Cache-Control':'no-store','Clear-Site-Data':'"cache", "storage"'}});
  response.cookies.set(SESSION_COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});
  return response;
 }catch{return authFailure('탈퇴 처리를 완료하지 못했어요. 다시 시도하거나 문의해 주세요. 일부 사진은 먼저 삭제되었을 수 있습니다.',503);}
}

async function oauthAccount(userId:string){
 const row=(await getPool().query("SELECT provider,provider_subject FROM oauth_accounts WHERE user_id=$1 AND provider IN ('apple','google') ORDER BY provider='apple' DESC LIMIT 1",[userId])).rows[0];
 return row as {provider:'apple'|'google';provider_subject:string}|undefined;
}
