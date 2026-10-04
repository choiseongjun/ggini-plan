'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Button,Card,LinkButton,Notice} from '../components/ui';
import {GoogleAuthProvider,OAuthProvider,revokeAccessToken,signInWithPopup,signOut} from 'firebase/auth';
import {firebaseAuth,firebaseLoginMessage} from '../../lib/firebase-client';
import {isNativeApp} from '../../lib/native-environment';
import {nativePushLogout} from '../../lib/native-push-client';
type Method='google'|'apple'|'password';
type Account={user:{id:string;email:string};method:Method};
const PHRASE='회원 탈퇴';
const LABEL:Record<Method,string>={google:'Google',apple:'Apple',password:'이메일'};
export default function DeleteAccountScreen(){
 const [account,setAccount]=useState<Account|null>(null),[loaded,setLoaded]=useState(false),[message,setMessage]=useState(''),[confirmation,setConfirmation]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[deleted,setDeleted]=useState(false);
 // Only read after the account loads, so the server render ("계정 확인 중") never depends on it.
 const [native]=useState(()=>typeof window!=='undefined'&&isNativeApp(window,navigator.userAgent));
 useEffect(()=>{let active=true;fetch('/api/account',{cache:'no-store'}).then(async r=>{if(r.ok){const d=await r.json();if(active)setAccount(d);}}).catch(()=>{if(active)setMessage('계정 정보를 불러오지 못했어요. 새로고침해 주세요.');}).finally(()=>{if(active)setLoaded(true);});return()=>{active=false;};},[]);
 const social=account?.method==='google'||account?.method==='apple';
 // The iOS WebView cannot open provider popups; the signed-in session plus the typed phrase confirms there.
 const reauth=social&&!native;
 const ready=confirmation.trim()===PHRASE&&(account?.method!=='password'||password.length>0);
 async function remove(){
  if(!account||busy||!ready)return;
  setBusy(true);setMessage('');
  try{
   let idToken;
   if(reauth){
    const provider=account.method==='apple'?new OAuthProvider('apple.com'):new GoogleAuthProvider();
    if(provider instanceof GoogleAuthProvider)provider.setCustomParameters({prompt:'select_account'});
    const credential=await signInWithPopup(firebaseAuth(),provider);idToken=await credential.user.getIdToken();
    if(account.method==='apple'){
     // Apple requires Sign in with Apple tokens to be revoked when the account is deleted.
     const accessToken=OAuthProvider.credentialFromResult(credential)?.accessToken;
     if(accessToken)await revokeAccessToken(firebaseAuth(),accessToken).catch(()=>{});
    }
   }
   const r=await fetch('/api/account',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmation:PHRASE,userId:account.user.id,password:account.method==='password'?password:undefined,idToken})});
   const d=await r.json();if(!r.ok)throw new Error(d.error);
   try{localStorage.clear();sessionStorage.clear();}catch{}
   if(native)nativePushLogout();
   setPassword('');setDeleted(true);setAccount(null);
  }catch(e){setMessage(firebaseLoginMessage(e));}finally{if(reauth)await signOut(firebaseAuth()).catch(()=>{});setBusy(false);}
 }
 if(deleted)return <Card tone="soft" className="delete-account-card is-done" aria-live="polite"><span className="delete-account-icon" aria-hidden="true">✓</span><h2>회원 탈퇴가 완료됐어요</h2><p>계정과 모든 기록을 삭제하고 로그아웃했어요. 그동안 끼니플랜을 써 주셔서 고마워요.</p><LinkButton variant="primary" href="/">홈으로 가기</LinkButton></Card>;
 return <Card tone="danger" className="delete-account-card" aria-labelledby="delete-account-title">
  <h2 id="delete-account-title">계정 삭제하기</h2>
  {!loaded?<p className="delete-account-muted">계정 확인 중…</p>:!account?<p>먼저 <Link href="/">홈에서 로그인</Link>한 뒤 이 페이지로 돌아오세요.</p>:<>
   <div className="delete-account-who"><span>{LABEL[account.method]} 계정</span><strong>{account.user.email}</strong></div>
   <ul className="delete-account-list"><li>식단·식사·물·체중 기록과 사진</li><li>신체 정보, 예산, 장보기 내역</li><li>공유 식단, 커뮤니티 글, 알림 설정</li></ul>
   <label className="delete-account-field"><span>확인을 위해 <b>‘{PHRASE}’</b>를 입력해 주세요</span><input value={confirmation} onChange={e=>setConfirmation(e.target.value)} disabled={busy} placeholder={PHRASE} autoComplete="off" enterKeyHint="done"/></label>
   {account.method==='password'&&<label className="delete-account-field"><span>현재 비밀번호</span><input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>}
   {reauth&&<p className="delete-account-muted">버튼을 누르면 {LABEL[account.method]} 로그인 창에서 본인 확인을 한 번 더 진행해요.</p>}
   <Button variant="danger" size="lg" block disabled={busy||!ready} onClick={()=>void remove()}>{busy?'삭제하는 중…':reauth?`${LABEL[account.method]} 본인 확인 후 영구 삭제`:'계정과 기록 영구 삭제'}</Button>
   <p className="delete-account-muted">삭제한 계정과 기록은 되돌릴 수 없어요.</p>
  </>}
  {message&&<Notice tone="error">{message}</Notice>}
 </Card>;
}
