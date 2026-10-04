'use client';

import {useEffect,useState} from 'react';
import {Icon} from './app-shell';
import {isNativeApp} from '../lib/native-environment';
import './install-prompt.css';

const dismissalKey='kkini-appstore-dismissed-until';
const appStoreUrl='https://apps.apple.com/kr/app/id6816291997';

export function InstallPrompt({active}:{active:boolean}){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{
  const isIos=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const update=()=>{
   if(!isIos||isNativeApp(window,navigator.userAgent)){setVisible(false);return;}
   try{setVisible(Number(localStorage.getItem(dismissalKey))<=Date.now());}
   catch{setVisible(true);}
  };
  const timer=window.setTimeout(update,0);
  const storageChanged=(event:StorageEvent)=>{if(event.key===dismissalKey||event.key===null)update();};
  // Disable the browser's PWA install promotion; the supported install path is the App Store.
  const preventPwaInstall=(event:Event)=>event.preventDefault();
  window.addEventListener('beforeinstallprompt',preventPwaInstall);
  window.addEventListener('ggini-native-ready',update);
  window.addEventListener('storage',storageChanged);
  return()=>{
   window.clearTimeout(timer);
   window.removeEventListener('beforeinstallprompt',preventPwaInstall);
   window.removeEventListener('ggini-native-ready',update);
   window.removeEventListener('storage',storageChanged);
  };
 },[]);
 function dismiss(){
  setVisible(false);
  try{localStorage.setItem(dismissalKey,String(Date.now()+7*24*60*60*1000));}catch{/* Dismiss for this visit when storage is unavailable. */}
 }
 if(!active||!visible)return null;
 return <aside className="install-prompt" aria-label="끼니플랜 App Store 안내">
  <div className="install-prompt-copy"><span className="install-prompt-icon" aria-hidden="true"><Icon name="home" size={23}/></span><div><strong>끼니플랜을 앱으로 만나보세요</strong><p>App Store에서 끼니플랜 앱을 설치할 수 있어요.</p></div></div>
  <button className="install-prompt-close" type="button" onClick={dismiss} aria-label="설치 안내 7일 동안 닫기"><Icon name="close" size={18}/></button>
  <div className="install-prompt-actions"><a className="install-prompt-primary" href={appStoreUrl}>App Store에서 받기</a><button className="install-prompt-later" type="button" onClick={dismiss}>나중에</button></div>
 </aside>;
}
