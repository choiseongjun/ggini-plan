import {isNativeApp} from './native-environment';

export const appStores={
 android:{name:'Google Play',url:'https://play.google.com/store/apps/details?id=kr.gginiplan.app'},
 ios:{name:'App Store',url:'https://apps.apple.com/kr/app/id6816291997'},
} as const;
export function mobileAppStore(userAgent:string,platform='',maxTouchPoints=0){
 if(/bot|crawler|spider|google-inspectiontool/i.test(userAgent))return null;
 if(/Android/i.test(userAgent))return appStores.android;
 if(/iPad|iPhone|iPod/i.test(userAgent)||(platform==='MacIntel'&&maxTouchPoints>1))return appStores.ios;
 return null;
}
const entryPaths=new Set(['/','/intro','/record','/stats','/profile','/next-meal','/plan','/ingredients','/cart','/calendar','/eat-out','/convenience']);
export function storeRedirectAllowed(url:URL,signals:object,userAgent:string,standalone:boolean){
 if(isNativeApp(signals,userAgent)||standalone||!entryPaths.has(url.pathname))return false;
 // Keep OAuth callbacks, push deep links and explicitly requested web visits intact.
 return !['code','state','auth_error','error','native','challenge','web'].some(key=>url.searchParams.has(key))&&url.searchParams.get('from')!=='push';
}
export const storeVisitKey='ggini-store-visit-v1';
export function claimStoreVisit(storage:Pick<Storage,'getItem'|'setItem'>){
 try{if(storage.getItem(storeVisitKey))return false;storage.setItem(storeVisitKey,'1');return storage.getItem(storeVisitKey)==='1';}
 catch{return false;} // Without session storage, offer the install link instead of risking a redirect loop.
}
