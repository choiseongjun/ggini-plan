'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {claimStoreVisit,mobileAppStore,storeRedirectAllowed} from '../lib/app-store';

export function MobileStoreRedirect(){
 const pathname=usePathname();
 useEffect(()=>{
  const timer=window.setTimeout(()=>{
   const store=mobileAppStore(navigator.userAgent,navigator.platform,navigator.maxTouchPoints);
   const standalone=window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true;
   if(!store||!storeRedirectAllowed(new URL(window.location.href),window,navigator.userAgent,standalone))return;
   try{if(claimStoreVisit(window.sessionStorage))window.location.assign(store.url);}catch{/* The install link remains available if navigation or storage is blocked. */}
  },500); // Allow the native bridge to announce itself before considering external navigation.
  return()=>window.clearTimeout(timer);
 },[pathname]);
 return null;
}
