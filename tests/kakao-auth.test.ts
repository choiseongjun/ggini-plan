import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {validKakaoState,kakaoIdentity,kakaoReturnPath,exchangeKakaoCode,beginKakaoLogin,consumeKakaoAttempt,kakaoHash} from '../lib/kakao-auth';
import {getPool} from '../lib/db';

test('Kakao state is bound to browser cookie and rejects malformed values',()=>{
 const state=randomBytes(32).toString('base64url');
 assert.equal(validKakaoState(state,state),true);
 for(const other of [undefined,null,'',state+'x',randomBytes(32).toString('base64url')])assert.equal(validKakaoState(state,other),false);
});
test('Kakao identity uses provider ID, never unverified email',()=>{
 const identity=kakaoIdentity({id:123,kakao_account:{email:'victim@example.com',profile:{nickname:' Tester '}}});
 assert.deepEqual(identity,{subject:'123',email:'kakao-123@kakao.local.invalid',name:'Tester'});
 for(const id of [0,-1,'123',NaN,1.5,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>kakaoIdentity({id}));
});
test('return path cannot redirect to external sites and preserves native challenge',()=>{
 assert.equal(kakaoReturnPath('https://evil.example'),'/');
 const challenge='a'.repeat(64);
 assert.equal(kakaoReturnPath(challenge),`/app-login?challenge=${challenge}&kakao=complete`);
 assert.equal(kakaoReturnPath(challenge,'kakao_cancelled'),`/app-login?challenge=${challenge}&auth_error=kakao_cancelled`);
});
test('code exchange sends secret only to Kakao and rejects invalid provider responses',async()=>{
 process.env.AUTH_URL='http://localhost:3001';process.env.KAKAO_LOGIN_REST_API_KEY='test-client';process.env.KAKAO_LOGIN_CLIENT_SECRET='test-secret';
 let calls=0;
 const fetcher:typeof fetch=async(url,init)=>{
  calls++;
  if(calls===1){assert.equal(url,'https://kauth.kakao.com/oauth/token');assert.equal((init?.body as URLSearchParams).get('client_secret'),'test-secret');return Response.json({access_token:'test-token'});}
  assert.equal(url,'https://kapi.kakao.com/v2/user/me');assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer test-token');return Response.json({id:456});
 };
 assert.equal((await exchangeKakaoCode('code',fetcher)).subject,'456');
 assert.equal(calls,2);
 await assert.rejects(exchangeKakaoCode('bad',async()=>Response.json({error:'invalid_grant'},{status:400})));
 await assert.rejects(exchangeKakaoCode('bad',async()=>Response.json({access_token:null})));
});
test('login attempts hash states, reject invalid challenges and consume only once without a real database',async()=>{
 process.env.DATABASE_URL='postgres://test:test@127.0.0.1:1/test';
 const pool=getPool(),original=pool.query;const attempts=new Map<string,unknown>();
 pool.query=(async(sql:string,args:unknown[]=[])=>{
  if(sql.startsWith('INSERT')){attempts.set(String(args[0]),{consent:null,mobile_challenge:args[2]});return {rows:[]};}
  if(sql.includes('RETURNING')){const row=attempts.get(String(args[0]));attempts.delete(String(args[0]));return {rows:row?[row]:[]};}
  return {rows:[]};
 }) as typeof pool.query;
 try{
  await assert.rejects(beginKakaoLogin(null,'unsafe'));
  const attempt=await beginKakaoLogin(null,'b'.repeat(64));
  assert.equal(attempts.has(kakaoHash(attempt.state)),true);assert.equal(attempts.has(attempt.state),false);
  assert.equal(new URL(attempt.url).searchParams.get('redirect_uri'),'http://localhost:3001/api/auth/kakao/callback');
  await assert.rejects(consumeKakaoAttempt(attempt.state,undefined));
  assert.equal((await consumeKakaoAttempt(attempt.state,attempt.state)).mobile_challenge,'b'.repeat(64));
  await assert.rejects(consumeKakaoAttempt(attempt.state,attempt.state));
 }finally{pool.query=original;await pool.end();}
});
