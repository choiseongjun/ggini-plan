'use client';
import {useEffect} from 'react';
import type {MealTimes} from './native-push-input';
type NativeWindow=Window&{__GGINI_NATIVE_PUSH__?:string;ReactNativeWebView?:{postMessage:(value:string)=>void}};
export type NativePushStatus={registered:boolean;subscribed:boolean;permissionGranted:boolean;times:MealTimes;configured:boolean;tested?:boolean};
export function nativePushPlatform(){return typeof window==='undefined'?undefined:(window as NativeWindow).__GGINI_NATIVE_PUSH__;}
export function nativePushRequest(action:string,expectedUserId:string,extra:Record<string,unknown>={}):Promise<NativePushStatus>{
 return new Promise((resolve,reject)=>{
  const bridge=(window as NativeWindow).ReactNativeWebView;
  if(!bridge){reject(new Error('앱에서 알림을 설정해 주세요.'));return;}
  const requestId=crypto.randomUUID();
  const timer=setTimeout(()=>{cleanup();reject(new Error('앱 알림 연결이 늦어지고 있어요. 다시 시도해 주세요.'));},45000);
  const cleanup=()=>{clearTimeout(timer);window.removeEventListener('ggini-native-push-result',receive);};
  const receive=(event:Event)=>{
   const detail=(event as CustomEvent).detail;
   if(detail?.requestId!==requestId)return;
   cleanup();
   if(detail.error)reject(new Error(detail.error));
   else{resolve(detail);window.dispatchEvent(new CustomEvent('ggini-push-status',{detail:{...detail,userId:expectedUserId}}));}
  };
  window.addEventListener('ggini-native-push-result',receive);
  bridge.postMessage(JSON.stringify({...extra,type:'ggini-push',action,requestId,expectedUserId}));
 });
}
export function useNativePush(userId:string|undefined){
 useEffect(()=>{
  if(!userId)return;
  let inFlight=false,active=true;
  const sync=()=>{
   if(!active||inFlight||nativePushPlatform()!=='android')return;
   inFlight=true;
   void nativePushRequest('sync',userId).catch(()=>{/* The reminder card offers retry and permission settings. */}).finally(()=>{inFlight=false;});
  };
  window.addEventListener('ggini-native-ready',sync);sync();
  const online=()=>sync();window.addEventListener('online',online);
  return()=>{active=false;window.removeEventListener('ggini-native-ready',sync);window.removeEventListener('online',online);};
 },[userId]);
}
export function nativePushLogout(){(window as NativeWindow).ReactNativeWebView?.postMessage(JSON.stringify({type:'ggini-logout'}));}
