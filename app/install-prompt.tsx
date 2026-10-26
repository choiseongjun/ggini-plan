'use client';

import {useEffect,useState} from 'react';
import {Icon} from './app-shell';
import {isNativeApp} from '../lib/native-environment';
import {appOpenUrl,mobileAppStore,storeRedirectAllowed} from '../lib/app-store';
import './install-prompt.css';

const dismissalKey='kkini-app-open-dismissed-until';

export function InstallPrompt({active}:{active:boolean}){
 const [visible,setVisible]=useState(false);
 const [store,setStore]=useState<ReturnType<typeof mobileAppStore>>(null);
 useEffect(()=>{
  const target=mobileAppStore(navigator.userAgent,navigator.platform,navigator.maxTouchPoints);
  const update=()=>{
   setStore(target);
   const standalone=window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true;
   if(!target||isNativeApp(window,navigator.userAgent)||!storeRedirectAllowed(new URL(window.location.href),window,navigator.userAgent,standalone)){setVisible(false);return;}
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
 if(!active||!visible||!store)return null;
 return <aside className="install-prompt" aria-label="끼니플랜 앱 열기">
  <div className="install-prompt-copy"><span className="install-prompt-icon" aria-hidden="true"><Icon name="home" size={23}/></span><div><strong>설치한 끼니플랜으로 이어서 보기</strong><p>앱이 있다면 바로 열어요. 아직 없다면 앱을 설치해 주세요.</p></div></div>
  <button className="install-prompt-close" type="button" onClick={dismiss} aria-label="설치 안내 7일 동안 닫기"><Icon name="close" size={18}/></button>
  <div className="install-prompt-actions"><a className="install-prompt-primary" href={appOpenUrl(store)}>앱으로 열기</a><a className="install-prompt-later" href={store.url}>앱 설치</a><button className="install-prompt-later" type="button" onClick={dismiss}>웹에서 계속</button></div>
 </aside>;
}
