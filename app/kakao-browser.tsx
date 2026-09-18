'use client';
import {useEffect,useState} from 'react';
import {isKakaoMobileBrowser,kakaoExternalUrl} from '../lib/kakao-browser';
import './kakao-browser.css';

export function KakaoBrowser(){
 const [visible,setVisible]=useState(false);
 const [message,setMessage]=useState('');
 useEffect(()=>{
  if(!isKakaoMobileBrowser(navigator.userAgent)||!kakaoExternalUrl(window.location.href))return;
  const timer=window.setTimeout(()=>{
   try{if(sessionStorage.getItem('kkini-kakao-stay'))return;}catch{/* Session storage may be unavailable. */}
   setVisible(true);
   let attempted=false;
   try{attempted=!!sessionStorage.getItem('kkini-kakao-opened');sessionStorage.setItem('kkini-kakao-opened','1');}catch{attempted=true;}
   if(!attempted){const url=kakaoExternalUrl(window.location.href);if(url)window.location.assign(url);}
  },0);
  return()=>window.clearTimeout(timer);
 },[]);
 function open(){const url=kakaoExternalUrl(window.location.href);if(url)window.location.assign(url);setMessage('열리지 않으면 카카오톡 메뉴에서 ‘다른 브라우저로 열기’를 선택해 주세요.');}
 async function copy(){try{await navigator.clipboard.writeText(window.location.href);setMessage('주소를 복사했어요. 기기 브라우저 주소창에 붙여 넣어 주세요.');}catch{setMessage('카카오톡 메뉴에서 링크를 복사하거나 ‘다른 브라우저로 열기’를 선택해 주세요.');}}
 function dismiss(){try{sessionStorage.setItem('kkini-kakao-stay','1');}catch{/* The banner can still be dismissed. */}setVisible(false);}
 if(!visible)return null;
 return <aside className="kakao-browser-notice" aria-label="기기 브라우저로 열기"><strong>기기 브라우저에서 이어서 이용하세요</strong><p>전환되지 않았다면 아래 버튼을 눌러 주세요.</p><div><button type="button" onClick={open}>기본 브라우저로 열기 ↗</button><button type="button" onClick={copy}>주소 복사</button></div><button type="button" className="kakao-browser-stay" onClick={dismiss}>카카오톡에서 계속 보기</button>{message&&<p role="status">{message}</p>}</aside>;
}
