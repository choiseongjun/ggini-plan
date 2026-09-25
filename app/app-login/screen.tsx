'use client';
import {useState} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {AuthScreen} from '../auth-screen';
export default function AppLogin(){
 const params=useSearchParams(),router=useRouter();
 const challenge=params.get('challenge')??'';
 const [redirect,setRedirect]=useState(''),[error,setError]=useState('');
 if(!/^[a-f0-9]{64}$/.test(challenge))return <main><h1>앱에서 로그인을 다시 시작해 주세요.</h1></main>;
 async function finish(){
  try{
   const response=await fetch('/api/auth/mobile/authorize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challenge})});
   const data=await response.json();if(!response.ok)throw new Error(data.error);
   if(!/^gginiplan:\/\/auth\?code=[a-f0-9]{64}$/.test(data.redirect))throw new Error('앱 연결을 확인해 주세요.');
   setRedirect(data.redirect);
  }catch(e){setError(e instanceof Error?e.message:'앱 연결에 실패했어요.');}
 }
 return <>{redirect?<main className="legal-page"><h1>로그인했어요</h1><p>아래 버튼으로 끼니플랜 앱에 돌아가세요. 연결은 2분 동안 유효합니다.</p><a href={redirect}>끼니플랜 앱으로 돌아가기</a></main>:<AuthScreen onSuccess={()=>void finish()} onExplore={()=>router.replace('/')} initialError={error}/>}<p role="status">{error}</p></>;
}
