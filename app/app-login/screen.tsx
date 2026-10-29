'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {AuthScreen} from '../auth-screen';
import {authErrors,type AuthErrorCode} from '../../lib/auth-messages';
import {GoogleAuthProvider,getRedirectResult,signInWithRedirect,signOut} from 'firebase/auth';
import {firebaseAuth,firebaseLoginMessage} from '../../lib/firebase-client';
import {finishAuthRedirect} from '../../lib/auth-funnel';
export default function AppLogin(){
 const params=useSearchParams(),router=useRouter();
 const challenge=params.get('challenge')??'';
 const [redirect,setRedirect]=useState(''),[error,setError]=useState('');
 const completion=useRef<{challenge:string;promise:Promise<string>}|null>(null);
 const starting=useRef<Promise<string|null>|null>(null);
 const complete=params.get('kakao')==='complete'||params.get('complete')==='1',authError=params.get('auth_error');
 const direct=params.get('provider')==='google'&&!complete&&!authError;
 useEffect(()=>{
  if(!direct||!/^[a-f0-9]{64}$/.test(challenge))return;
  if(!starting.current)starting.current=(async()=>{
   const auth=firebaseAuth(true),marker=`ggini-google-redirect:${challenge}`;
   const credential=await getRedirectResult(auth);
   if(!credential){
    if(sessionStorage.getItem(marker))throw Error('구글 로그인이 완료되지 않았어요. 아래 버튼으로 다시 시작해 주세요.');
    sessionStorage.setItem(marker,'started');const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
    await signInWithRedirect(auth,provider);return null;
   }
   sessionStorage.removeItem(marker);
   try{
    const response=await fetch('/api/auth/firebase',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:await credential.user.getIdToken()})});
    const data=await response.json();if(!response.ok)throw Error(data.error||'구글 로그인을 완료하지 못했어요.');
    const authorized=await fetch('/api/auth/mobile/authorize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challenge})});
    const result=await authorized.json();if(!authorized.ok||!/^gginiplan:\/\/auth\?code=[a-f0-9]{64}$/.test(result.redirect))throw Error('앱 로그인 연결에 실패했어요.');
    return result.redirect as string;
   }finally{await signOut(auth).catch(()=>{});}
  })();
  let alive=true;void starting.current.then(value=>{if(alive&&value)setRedirect(value);}).catch(e=>{if(alive)setError(firebaseLoginMessage(e));});return()=>{alive=false;};
 },[direct,challenge]);
 useEffect(()=>{if(redirect)window.location.replace(redirect);},[redirect]);
 useEffect(()=>{
  if(!complete||!/^[a-f0-9]{64}$/.test(challenge))return;
  // Full-page OAuth returns with our HttpOnly session. Complete the existing native exchange.
  let alive=true;
  if(completion.current?.challenge!==challenge)completion.current={challenge,promise:fetch('/api/auth/mobile/authorize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challenge})}).then(async response=>{
    const data=await response.json();if(!response.ok||!/^gginiplan:\/\/auth\?code=[a-f0-9]{64}$/.test(data.redirect))throw new Error('앱 로그인 연결에 실패했어요. 앱에서 다시 시작해 주세요.');
    finishAuthRedirect(true);
   return data.redirect as string;
  })};
  void completion.current.promise.then(value=>{if(alive)setRedirect(value);}).catch(e=>{if(alive)setError(e instanceof Error?e.message:'앱 연결에 실패했어요.');});
  return()=>{alive=false;};
 },[complete,challenge]);
 if(!/^[a-f0-9]{64}$/.test(challenge))return <main><h1>앱에서 로그인을 다시 시작해 주세요.</h1></main>;
 async function finish(){
  try{
   const response=await fetch('/api/auth/mobile/authorize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challenge})});
   const data=await response.json();if(!response.ok)throw new Error(data.error);
   if(!/^gginiplan:\/\/auth\?code=[a-f0-9]{64}$/.test(data.redirect))throw new Error('앱 연결을 확인해 주세요.');
   setRedirect(data.redirect);
  }catch(e){setError(e instanceof Error?e.message:'앱 연결에 실패했어요.');}
 }
 return <>{redirect?<main className="legal-page"><h1>앱으로 돌아가는 중이에요</h1><p>자동으로 열리지 않으면 아래 버튼을 눌러 주세요. 연결은 2분 동안 유효해요.</p><a href={redirect}>끼니플랜 앱으로 돌아가기</a></main>:(complete||direct)&&!error?<main><p role="status">{direct?'구글 계정 선택 화면으로 연결하고 있어요…':'끼니플랜 앱으로 연결하고 있어요…'}</p></main>:<AuthScreen onSuccess={()=>void finish()} onExplore={()=>router.replace('/')} initialError={error||(authError&&Object.hasOwn(authErrors,authError)?authErrors[authError as AuthErrorCode]:'')}/>}<p role="status">{error}</p></>;
}
