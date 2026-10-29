'use client';
import {trackAnalytics} from './analytics';
const key='ggini-auth-redirect-at';
export function rememberAuthRedirect(){try{sessionStorage.setItem(key,String(Date.now()));}catch{/* optional telemetry */}}
export function finishAuthRedirect(success:boolean){
 try{
  const raw=sessionStorage.getItem(key);sessionStorage.removeItem(key);
  const at=Number(raw),age=Date.now()-at;
  if(raw&&Number.isFinite(at)&&age>=0&&age<30*60_000)trackAnalytics(success?'auth_succeeded':'auth_failed');
 }catch{/* optional telemetry */}
}
