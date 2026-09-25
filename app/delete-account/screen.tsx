'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {GoogleAuthProvider,signInWithPopup,signOut} from 'firebase/auth';
import {firebaseAuth,firebaseLoginMessage} from '../../lib/firebase-client';
type Account={user:{id:string;email:string};method:'google'|'password'};
export default function DeleteAccountScreen(){
 const [account,setAccount]=useState<Account|null>(null),[loaded,setLoaded]=useState(false),[message,setMessage]=useState(''),[confirmation,setConfirmation]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[deleted,setDeleted]=useState(false);
 useEffect(()=>{let active=true;fetch('/api/account',{cache:'no-store'}).then(async r=>{if(r.ok){const d=await r.json();if(active)setAccount(d);}}).catch(()=>{if(active)setMessage('계정 정보를 불러오지 못했어요. 새로고침해 주세요.');}).finally(()=>{if(active)setLoaded(true);});return()=>{active=false;};},[]);
 async function remove(){
  if(!account||busy||confirmation!=='회원 탈퇴')return;
  setBusy(true);setMessage('');
  try{
   let idToken;
   if(account.method==='google'){
    const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
    const credential=await signInWithPopup(firebaseAuth(),provider);idToken=await credential.user.getIdToken();
   }
   const r=await fetch('/api/account',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmation,userId:account.user.id,password,idToken})});
   const d=await r.json();if(!r.ok)throw new Error(d.error);
   localStorage.clear();sessionStorage.clear();setPassword('');setDeleted(true);setAccount(null);
  }catch(e){setMessage(firebaseLoginMessage(e));}finally{if(account.method==='google')await signOut(firebaseAuth()).catch(()=>{});setBusy(false);}
 }
 if(deleted)return <section><h2>회원 탈퇴가 완료됐습니다</h2><p>계정과 연결 기록을 삭제하고 로그아웃했습니다.</p><Link href="/">홈으로</Link></section>;
 const native=typeof window!=='undefined'&&!!(window as Window&{ReactNativeWebView?:unknown}).ReactNativeWebView;
 return <section><h2>계정 삭제하기</h2>{!loaded?<p>계정 확인 중…</p>:!account?<p>먼저 <Link href="/">홈에서 로그인</Link>한 뒤 이 페이지로 돌아오세요.</p>:<><p>삭제할 계정: {account.user.email}</p>{account.method==='google'&&native?<p>구글 본인 확인은 외부 브라우저에서 진행합니다. <a href="https://gginiplan.kr/delete-account" target="_blank" rel="noreferrer">브라우저에서 탈퇴하기</a>를 열고 로그인해 주세요.</p>:<><label>확인 문구 ‘회원 탈퇴’<input value={confirmation} onChange={e=>setConfirmation(e.target.value)} disabled={busy}/></label>{account.method==='password'&&<label>현재 비밀번호<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>}<p><button type="button" disabled={busy||confirmation!=='회원 탈퇴'} onClick={()=>void remove()}>{busy?'삭제 처리 중…':account.method==='google'?'Google 본인 확인 후 영구 삭제':'계정과 기록 영구 삭제'}</button></p></>}</>}{message&&<p role="alert">{message}</p>}</section>;
}
