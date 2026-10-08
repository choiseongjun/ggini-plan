'use client';
import {useState,useRef} from 'react';
import Script from 'next/script';
import {publicPlanShareUrl} from '../lib/plan-share-link';
import {trackAnalytics} from '../lib/analytics';
import type {PlanConditions} from '../lib/shopping-plan';
import './shared-plan.css';
const kakaoKey=process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
type KakaoSdk={init:(key:string)=>void;isInitialized:()=>boolean;Share:{sendDefault:(options:{objectType:'text';text:string;link:{webUrl:string;mobileWebUrl:string};buttonTitle:string})=>void}};
function kakaoSdk(){return (window as Window & {Kakao?:KakaoSdk}).Kakao;}
export function SharePlanButton({userId,onLogin,conditions,mealIds,disabled=false}:{disabled?:boolean;userId?:string;onLogin:()=>void;conditions:PlanConditions;mealIds:string[]}){
 const [url,setUrl]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const lock=useRef(false);
 const [kakaoReady,setKakaoReady]=useState(false),[kakaoFailed,setKakaoFailed]=useState(false);
 const shareText=`이번 식단, 같이 볼까요? ${conditions.people??1}명 · ${mealIds.length}개 메뉴를 로그인 없이 확인하세요.`;
 async function shareOther(){
  try{
   if(!navigator.share){setMessage('이 브라우저에서는 앱 공유를 지원하지 않아요. 링크를 복사해 카카오톡이나 문자에 붙여 넣어 주세요.');return;}
   await navigator.share({title:'같이 먹어요 · 끼니플랜',text:shareText,url});
   trackAnalytics('plan_shared',{channel:'other'});
  }catch(e){if(!(e instanceof Error&&e.name==='AbortError'))setMessage('공유 창을 열지 못했어요. 링크를 복사해 보내 주세요.');}
 }
 function shareKakao(){
  try{
   const sdk=kakaoSdk();if(!sdk||!kakaoReady)throw new Error('not ready');
   sdk.Share.sendDefault({objectType:'text',text:shareText,link:{webUrl:url,mobileWebUrl:url},buttonTitle:'식단 보기'});
   trackAnalytics('plan_shared',{channel:'kakao'});
   setMessage('카카오톡에서 보낼 친구나 채팅방을 선택해 주세요.');
  }catch{setMessage('카카오톡 공유를 열지 못했어요. 다른 앱으로 보내기나 링크 복사를 이용해 주세요.');}
 }
 async function create(){
  if(disabled)return;if(!userId){onLogin();return;}if(lock.current)return;lock.current=true;setBusy(true);setMessage('');
  try{const r=await fetch('/api/shared-plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'share',conditions,mealIds})});const d=await r.json();if(!r.ok)throw new Error(d.error);setUrl(publicPlanShareUrl(d.path));setMessage('보낼 앱을 선택해 주세요.');}
  catch(e){setMessage(e instanceof Error?e.message:'공유 링크를 만들지 못했어요.');}finally{lock.current=false;setBusy(false);}
 }
 return <section className="share-plan-actions" aria-label="내 식단 공유">
  {kakaoKey&&<Script src="https://t1.kakaocdn.net/kakao_js_sdk/2.8.2/kakao.min.js" integrity="sha384-zt/G7/KfaRQ9dT/QIkS0ujMtzouJqzuSJcXVQu50x0rl/+mD1dc70AeOejVbMD9E" crossOrigin="anonymous" onReady={()=>{try{const sdk=kakaoSdk();if(!sdk)throw new Error('missing sdk');if(!sdk.isInitialized())sdk.init(kakaoKey);setKakaoReady(true);setKakaoFailed(false);}catch{setKakaoFailed(true);}}} onError={()=>setKakaoFailed(true)}/>}
  <div className="share-plan-heading"><span aria-hidden="true">↗</span><div><strong>이번 식단, 같이 볼까요?</strong><p>{conditions.people??1}명 · {mealIds.length}개 메뉴를 링크 하나로 보내요.</p></div></div><p>받는 사람은 로그인 없이 메뉴를 볼 수 있어요. 신체 정보·개인 목표·식사 기록은 공유하지 않아요.</p>
  {!url?<button className="share-plan-primary" type="button" disabled={busy||disabled} onClick={()=>void create()}>{busy?'링크 만드는 중…':userId?'식단 공유하기':'로그인하고 식단 공유하기'}</button>:<>
   <div className="share-plan-channels">
    {kakaoKey&&<button className="share-plan-kakao" type="button" disabled={!kakaoReady||disabled} onClick={shareKakao}><span aria-hidden="true">●</span>{kakaoReady?'카카오톡으로 보내기':kakaoFailed?'카카오톡 연결 불가':'카카오톡 연결 중…'}</button>}
    <button className="share-plan-primary" type="button" disabled={disabled} onClick={()=>void shareOther()}>{kakaoKey?'다른 앱으로 보내기':'앱 선택해서 보내기'}</button>
   </div>
   <p>{kakaoKey?'문자나 다른 메신저로도 보낼 수 있어요.':'공유창에서 카카오톡·문자 등 보낼 앱을 선택해 주세요.'}</p>
   {kakaoFailed&&<p role="status">카카오톡에 연결하지 못했어요. 다른 앱으로 보내기나 링크 복사를 이용해 주세요.</p>}
   <label>공유 링크<input readOnly value={url} onFocus={e=>e.target.select()}/></label>
   <div><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(url);trackAnalytics('plan_shared',{channel:'link'});setMessage('링크를 복사했어요. 카카오톡이나 문자에 붙여 넣어 주세요.');}catch{setMessage('자동 복사가 안 돼요. 위 링크를 선택해서 직접 복사해 주세요.');}}}>링크 복사</button><a href={url} target="_blank" rel="noopener noreferrer">공유 화면 보기 ↗</a></div>
   <small>이 링크에는 지금 식단이 저장돼요. 이후 내 식단을 바꿔도 공유한 내용은 유지돼요.</small>
  </>}{message&&<p role="status">{message}</p>}
 </section>;
}
