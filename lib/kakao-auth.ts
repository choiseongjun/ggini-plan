import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {getPool} from './db';
import {appOrigin,googleUser} from './google-auth';
import {validMemberConsent,type MemberConsent} from './member-policy';
import {mobileSecretValid} from './mobile-login';
import type {KakaoAuthErrorCode} from './auth-messages';

export const KAKAO_COOKIE='kkiniplan_kakao_state';
export const KAKAO_PATH='/api/auth/kakao';
export class KakaoAuthError extends Error{constructor(public readonly code:KakaoAuthErrorCode){super(code);}}
export const kakaoHash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function kakaoConfig(){
 const clientId=process.env.KAKAO_LOGIN_REST_API_KEY?.trim();
 if(!clientId)throw new KakaoAuthError('kakao_unavailable');
 return {clientId,clientSecret:process.env.KAKAO_LOGIN_CLIENT_SECRET?.trim(),redirectUri:`${appOrigin()}/api/auth/kakao/callback`};
}
export function kakaoReturnPath(challenge:string|null,code?:KakaoAuthErrorCode){
 const url=new URL(challenge&&mobileSecretValid(challenge)?'/app-login':'/', 'https://local.invalid');
 if(challenge&&mobileSecretValid(challenge)){url.searchParams.set('challenge',challenge);if(!code)url.searchParams.set('kakao','complete');}
 if(code)url.searchParams.set('auth_error',code);
 return url.pathname+url.search;
}
export function validKakaoState(state:unknown,cookie:unknown):state is string{
 return typeof state==='string'&&typeof cookie==='string'&&/^[A-Za-z0-9_-]{43}$/.test(state)&&/^[A-Za-z0-9_-]{43}$/.test(cookie)&&timingSafeEqual(Buffer.from(state),Buffer.from(cookie));
}
export async function beginKakaoLogin(consent:unknown,challenge:unknown){
 const {clientId,redirectUri}=kakaoConfig();
 if(challenge!==undefined&&challenge!==null&&!mobileSecretValid(challenge))throw new KakaoAuthError('kakao_failed');
 const state=randomBytes(32).toString('base64url');
 await getPool().query('DELETE FROM kakao_login_attempts WHERE expires_at<=NOW()');
 await getPool().query('INSERT INTO kakao_login_attempts(state_hash,consent,mobile_challenge,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL \'10 minutes\')',[kakaoHash(state),validMemberConsent(consent)?JSON.stringify(consent):null,challenge??null]);
 const url=new URL('https://kauth.kakao.com/oauth/authorize');
 url.search=new URLSearchParams({client_id:clientId,redirect_uri:redirectUri,response_type:'code',state}).toString();
 return {state,url:url.href};
}
export async function consumeKakaoAttempt(state:string|null,cookie:string|undefined){
 if(!validKakaoState(state,cookie))throw new KakaoAuthError('kakao_expired');
 const result=await getPool().query<{consent:MemberConsent|null;mobile_challenge:string|null}>('DELETE FROM kakao_login_attempts WHERE state_hash=$1 AND expires_at>NOW() RETURNING consent,mobile_challenge',[kakaoHash(state)]);
 if(!result.rows[0])throw new KakaoAuthError('kakao_expired');
 return result.rows[0];
}
// Identity comes only from Kakao's authenticated user-info endpoint, not a client-supplied ID/email.
export function kakaoIdentity(value:unknown){
 const data=value as {id?:unknown;kakao_account?:{profile?:{nickname?:unknown}}}|null;
 if(!data||typeof data.id!=='number'||!Number.isSafeInteger(data.id)||data.id<=0)throw new KakaoAuthError('kakao_failed');
 const nickname=data.kakao_account?.profile?.nickname;
 const subject=String(data.id);
 // Reserved, non-deliverable internal identifier for the legacy NOT NULL email column.
 // Never request email consent or merge a Kakao identity with another provider by email.
 return {subject,email:`kakao-${subject}@kakao.local.invalid`,name:typeof nickname==='string'&&nickname.trim()?nickname.trim().slice(0,80):'카카오 회원'};
}
export async function exchangeKakaoCode(code:string,fetcher:typeof fetch=fetch){
 if(!code||code.length>4096)throw new KakaoAuthError('kakao_failed');
 const config=kakaoConfig();
 const body=new URLSearchParams({grant_type:'authorization_code',client_id:config.clientId,redirect_uri:config.redirectUri,code});
 if(config.clientSecret)body.set('client_secret',config.clientSecret);
 const response=await fetcher('https://kauth.kakao.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=utf-8'},body,signal:AbortSignal.timeout(15000),cache:'no-store',redirect:'error'});
 const token=await response.json().catch(()=>null);
 if(!response.ok||typeof token?.access_token!=='string'||!token.access_token||token.access_token.length>8192)throw new KakaoAuthError('kakao_failed');
 const user=await fetcher('https://kapi.kakao.com/v2/user/me',{headers:{Authorization:`Bearer ${token.access_token}`},signal:AbortSignal.timeout(15000),cache:'no-store',redirect:'error'});
 if(!user.ok)throw new KakaoAuthError('kakao_failed');
 return kakaoIdentity(await user.json());
}
export async function kakaoUser(identity:ReturnType<typeof kakaoIdentity>,consent:unknown){return googleUser(identity,consent,'kakao');}
