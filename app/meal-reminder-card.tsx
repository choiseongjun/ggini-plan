'use client';

import {useEffect,useState} from 'react';
import {trackPlanner} from '../lib/track-planner';
import './meal-reminder-card.css';
import {nativePushPlatform} from '../lib/native-push-client';
import {NativeMealReminderCard} from './native-meal-reminder-card';
import {isNativeApp} from '../lib/native-environment';

type Slot='breakfast'|'lunch'|'dinner';
type Times=Partial<Record<Slot,string>>;
const SLOTS:[Slot,string,string][]=[['breakfast','아침','08:00'],['lunch','점심','12:00'],['dinner','저녁','18:30']];

// 브라우저 푸시 서버 연결 실패("Registration failed - push service error" 등)를 사람이 할 수 있는 조치로 바꾼다.
function subscribeError(e:unknown){
 const text=e instanceof Error?`${e.name}: ${e.message}`:String(e);
 if(/permission|denied|NotAllowed/i.test(text))return '알림 권한이 막혀 있어요. 주소창 왼쪽 자물쇠 → 알림 → 허용으로 바꿔 주세요.';
 const brave=Boolean((navigator as Navigator&{brave?:unknown}).brave);
 if(brave)return 'Brave는 기본 설정에서 푸시 알림이 꺼져 있어요. 설정 → 개인정보 보호 및 보안 → "Google 서비스로 푸시 메시징 사용"을 켠 뒤 다시 시도해 주세요.';
 if(/push service|Registration failed|AbortError/i.test(text))return '브라우저의 알림 서버 연결에 실패했어요. 지원되는 브라우저에서도 발생할 수 있어요. 사이트 알림 권한을 확인하고 브라우저를 완전히 종료한 뒤 다시 시도해 주세요. 계속 실패하면 아래 오류 상세를 알려 주세요.';
 return text||'알림을 켜지 못했어요.';
}

function keyBytes(base64:string){
 base64=base64.trim();
 const padded=(base64+'='.repeat((4-base64.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/');
 return Uint8Array.from(atob(padded),c=>c.charCodeAt(0));
}

// 식사 시간 알림: 끼니마다 "오늘 저녁은 ○○" 알림을 받는다. 기기(브라우저)마다 따로 켠다.
export function MealReminderCard(){
 const [platform,setPlatform]=useState<string|undefined>(),[native,setNative]=useState<boolean|null>(null);
 useEffect(()=>{const update=()=>{setPlatform(nativePushPlatform());setNative(isNativeApp(window,navigator.userAgent));};update();window.addEventListener('ggini-native-ready',update);return()=>window.removeEventListener('ggini-native-ready',update);},[]);
 if(platform==='android'||platform==='ios')return <NativeMealReminderCard/>;
 // Inside the app the push bridge can be injected late; never flash the browser/App Store guidance there.
 if(native!==false)return <section className="mr-card" aria-busy="true"><p className="mr-note">알림 설정을 불러오는 중이에요…</p></section>;
 if(platform==='unsupported')return <section className="mr-card"><p>이 기기의 앱 알림은 아직 준비 중이에요.</p></section>;
 return <WebMealReminderCard/>;
}
function WebMealReminderCard(){
 const [support,setSupport]=useState<'checking'|'ok'|'unsupported'|'ios-install'>('checking');
 const [endpoint,setEndpoint]=useState<string|null>(null);
 const [subscribed,setSubscribed]=useState(false);
 const [times,setTimes]=useState<Times>({lunch:'12:00',dinner:'18:30'});
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [testing,setTesting]=useState(false);
 const [diagnostic,setDiagnostic]=useState('');
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
  })().catch(()=>{if(alive){setSupport('ok');setError('알림 상태를 불러오지 못했어요. 알림 켜기를 눌러 다시 시도해 주세요.');}});
  return()=>{alive=false;};
 },[]);

 async function save(next:Times,enable:boolean){
  setBusy(true);setError('');setMessage('');setDiagnostic('');
  let step='권한 확인';
  try{
   if(!Object.keys(next).length){await turnOff();return;}
   if(Notification.permission!=='granted'&&await Notification.requestPermission()!=='granted')throw new Error('알림 권한을 허용해야 받을 수 있어요. 브라우저 설정에서 알림을 허용해 주세요.');
   step='서비스 워커 등록';
   await navigator.serviceWorker.register('/sw.js',{scope:'/'});
   // 서비스 워커가 활성화된 뒤에 구독해야 한다(막 등록한 직후 구독하면 실패하는 브라우저가 있다).
   const registration=await navigator.serviceWorker.ready;
   step='푸시 구독 연결';
   let sub=await registration.pushManager.getSubscription();
   if(!sub){
    const key=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();if(!key)throw new Error('알림 설정이 아직 준비되지 않았어요.');
    const options={userVisibleOnly:true,applicationServerKey:keyBytes(key)};
    try{sub=await registration.pushManager.subscribe(options);}
    catch{
     // 예전 키로 만든 구독이 남아 있으면 지우고 한 번 더 시도한다.
     const stale=await registration.pushManager.getSubscription();await stale?.unsubscribe().catch(()=>{});
     sub=await registration.pushManager.subscribe(options);
    }
   }
   step='알림 설정 저장';
   const r=await fetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subscription:sub.toJSON(),times:next})});
   const d=await r.json();if(!r.ok)throw new Error(d.error);
   setEndpoint(sub.endpoint);setSubscribed(true);setTimes(next);
   if(enable){trackPlanner('push_enabled');setMessage('알림을 켰어요. 정한 시간에 오늘 먹을 메뉴를 알려 드릴게요.');}
  }catch(e){setError(subscribeError(e));setDiagnostic(`${step} · ${e instanceof Error?`${e.name}: ${e.message}`:String(e)} · 권한: ${Notification.permission}`);}
  finally{setBusy(false);}
 }
 async function sendTest(){
  setTesting(true);setError('');setMessage('');
  try{
   const registration=await navigator.serviceWorker.getRegistration('/');
   const sub=await registration?.pushManager.getSubscription();
   const target=sub?.endpoint??endpoint;if(!target)throw new Error('이 기기의 알림 구독이 없어요. 알림을 다시 켜 주세요.');
   const r=await fetch('/api/push/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:target})});
   const d=await r.json();if(!r.ok)throw new Error(d.error);
   setMessage(d.withMenu?'테스트 알림을 보냈어요. 알림의 [먹었어요]를 누르면 실제로 기록돼요.':'테스트 알림을 보냈어요. 저장한 식단이 있으면 오늘 메뉴가 알림에 나와요.');
  }catch(e){setError(e instanceof Error?e.message:'테스트 알림을 보내지 못했어요.');}
  finally{setTesting(false);}
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
  {support==='ios-install'&&<p className="mr-note">아이폰에서는 <a href="https://apps.apple.com/kr/app/id6816291997">App Store에서 끼니플랜 받기</a>로 앱을 설치한 뒤 식사 알림을 켜 주세요.</p>}
  {support==='unsupported'&&<p className="mr-note">이 브라우저에서는 알림을 받을 수 없어요. 크롬이나 홈 화면에 추가한 앱에서 켜 주세요.</p>}
  {support==='ok'&&<ul className={`mr-times${subscribed?'':' is-off'}`}>{SLOTS.map(([slot,label,fallback])=>{const on=Boolean(times[slot]);return <li key={slot}>
   <label className="mr-slot"><input type="checkbox" checked={on} disabled={busy} onChange={e=>{const next={...times};if(e.target.checked)next[slot]=fallback;else delete next[slot];if(subscribed)void save(next,false);else setTimes(next);}}/>{label}</label>
   <input type="time" value={times[slot]??fallback} disabled={busy||!on} aria-label={`${label} 알림 시간`} onChange={e=>{const next={...times,[slot]:e.target.value};if(subscribed)void save(next,false);else setTimes(next);}}/>
  </li>;})}</ul>}
  {message&&<p className="mr-msg" role="status">{message}</p>}
  {error&&<p className="mr-error" role="alert">{error}</p>}
  {diagnostic&&<details className="mr-note"><summary>오류 상세</summary><p>{diagnostic}</p></details>}
  {support==='ok'&&subscribed&&<button type="button" className="mr-test" disabled={busy||testing} onClick={()=>void sendTest()}>{testing?'보내는 중…':'테스트 알림 보내기'}</button>}
  {support==='ok'&&<small className="mr-foot">이미 먹었다고 기록한 끼니는 알리지 않아요. 기기마다 따로 켜야 해요.</small>}
 </section>;
}
