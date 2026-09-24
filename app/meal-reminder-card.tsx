'use client';

import {useEffect,useState} from 'react';
import {trackPlanner} from '../lib/track-planner';
import './meal-reminder-card.css';

type Slot='breakfast'|'lunch'|'dinner';
type Times=Partial<Record<Slot,string>>;
const SLOTS:[Slot,string,string][]=[['breakfast','아침','08:00'],['lunch','점심','12:00'],['dinner','저녁','18:30']];

function keyBytes(base64:string){
 const padded=(base64+'='.repeat((4-base64.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/');
 return Uint8Array.from(atob(padded),c=>c.charCodeAt(0));
}

// 식사 시간 알림: 끼니마다 "오늘 저녁은 ○○" 알림을 받는다. 기기(브라우저)마다 따로 켠다.
export function MealReminderCard(){
 const [support,setSupport]=useState<'checking'|'ok'|'unsupported'|'ios-install'>('checking');
 const [endpoint,setEndpoint]=useState<string|null>(null);
 const [subscribed,setSubscribed]=useState(false);
 const [times,setTimes]=useState<Times>({lunch:'12:00',dinner:'18:30'});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{
  let alive=true;
  (async()=>{
   const ios=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true;
   if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){if(alive)setSupport(ios&&!standalone?'ios-install':'unsupported');return;}
   const registration=await navigator.serviceWorker.getRegistration('/');
   const sub=await registration?.pushManager.getSubscription();
   const r=await fetch(`/api/push${sub?`?endpoint=${encodeURIComponent(sub.endpoint)}`:''}`,{cache:'no-store'});
   const d=r.ok?await r.json():null;
   if(!alive)return;
   setSupport('ok');setEndpoint(sub?.endpoint??null);setSubscribed(Boolean(d?.subscribed));if(d?.times&&Object.keys(d.times).length)setTimes(d.times);
  })().catch(()=>{if(alive)setSupport('unsupported');});
  return()=>{alive=false;};
 },[]);

 async function save(next:Times,enable:boolean){
  setBusy(true);setError('');setMessage('');
  try{
   if(!Object.keys(next).length){await turnOff();return;}
   const registration=await navigator.serviceWorker.register('/sw.js',{scope:'/'});
   let sub=await registration.pushManager.getSubscription();
   if(!sub){
    if(Notification.permission!=='granted'&&await Notification.requestPermission()!=='granted')throw new Error('알림 권한을 허용해야 받을 수 있어요. 브라우저 설정에서 알림을 허용해 주세요.');
    const key=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;if(!key)throw new Error('알림 설정이 아직 준비되지 않았어요.');
    sub=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(key)});
   }
   const r=await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:sub.toJSON(),times:next})});
   const d=await r.json();if(!r.ok)throw new Error(d.error);
   setEndpoint(sub.endpoint);setSubscribed(true);setTimes(next);
   if(enable){trackPlanner('push_enabled');setMessage('알림을 켰어요. 정한 시간에 오늘 먹을 메뉴를 알려 드릴게요.');}
  }catch(e){setError(e instanceof Error?e.message:'알림을 켜지 못했어요.');}
  finally{setBusy(false);}
 }
 async function turnOff(){
  setBusy(true);setError('');setMessage('');
  try{
   const registration=await navigator.serviceWorker.getRegistration('/');
   const sub=await registration?.pushManager.getSubscription();
   const target=sub?.endpoint??endpoint;
   if(target)await fetch(`/api/push?endpoint=${encodeURIComponent(target)}`,{method:'DELETE'});
   await sub?.unsubscribe();
   setSubscribed(false);setMessage('알림을 껐어요.');
  }catch{setError('알림을 끄지 못했어요.');}
  finally{setBusy(false);}
 }

 if(support==='checking')return null;
 return <section className="mr-card" aria-label="식사 알림">
  <header><div><span className="mr-kicker">식사 알림</span><h3>밥 먹을 시간에 오늘 메뉴를 알려 드려요</h3></div>
   {support==='ok'&&<button type="button" role="switch" aria-checked={subscribed} className="mr-switch" disabled={busy} onClick={()=>void(subscribed?turnOff():save(times,true))}><span aria-hidden="true"/></button>}</header>
  {support==='ios-install'&&<p className="mr-note">아이폰은 Safari에서 <b>공유 → 홈 화면에 추가</b>로 앱을 설치한 뒤 켤 수 있어요.</p>}
  {support==='unsupported'&&<p className="mr-note">이 브라우저에서는 알림을 받을 수 없어요. 크롬이나 홈 화면에 추가한 앱에서 켜 주세요.</p>}
  {support==='ok'&&<ul className={`mr-times${subscribed?'':' is-off'}`}>{SLOTS.map(([slot,label,fallback])=>{const on=Boolean(times[slot]);return <li key={slot}>
   <label className="mr-slot"><input type="checkbox" checked={on} disabled={busy} onChange={e=>{const next={...times};if(e.target.checked)next[slot]=fallback;else delete next[slot];if(subscribed)void save(next,false);else setTimes(next);}}/>{label}</label>
   <input type="time" value={times[slot]??fallback} disabled={busy||!on} aria-label={`${label} 알림 시간`} onChange={e=>{const next={...times,[slot]:e.target.value};if(subscribed)void save(next,false);else setTimes(next);}}/>
  </li>;})}</ul>}
  {message&&<p className="mr-msg" role="status">{message}</p>}
  {error&&<p className="mr-error" role="alert">{error}</p>}
  {support==='ok'&&<small className="mr-foot">이미 먹었다고 기록한 끼니는 알리지 않아요. 기기마다 따로 켜야 해요.</small>}
 </section>;
}
