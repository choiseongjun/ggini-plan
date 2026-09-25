'use client';
import {useEffect,useState} from 'react';
import {nativePushRequest,type NativePushStatus} from '../lib/native-push-client';
import {DEFAULT_NATIVE_TIMES,type MealTimes} from '../lib/native-push-input';
const slots=[['breakfast','아침','08:00'],['lunch','점심','12:00'],['dinner','저녁','18:30']] as const;
export function NativeMealReminderCard(){
 const [userId,setUserId]=useState(''),[status,setStatus]=useState<NativePushStatus|null>(null);
 const [times,setTimes]=useState<MealTimes>(DEFAULT_NATIVE_TIMES),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{
  let alive=true,id='';
  const update=(event:Event)=>{const data=(event as CustomEvent).detail;if(alive&&data?.userId===id){setStatus(data);setTimes(data.times);}};
  window.addEventListener('ggini-push-status',update);
  void fetch('/api/auth/me',{cache:'no-store'}).then(r=>r.json()).then(async data=>{
   if(!alive||!data.user?.id)return;id=String(data.user.id);setUserId(id);
   const value=await nativePushRequest('status',id);if(alive){setStatus(value);setTimes(value.times);}
  }).catch(()=>{if(alive)setError('알림 상태를 확인하지 못했어요. 아래 버튼으로 다시 연결해 주세요.');});
  return()=>{alive=false;window.removeEventListener('ggini-push-status',update);};
 },[]);
 async function run(action:string,next=times){
  if(!userId)return;
  setBusy(true);setError('');setMessage('');
  try{
   const value=await nativePushRequest(action,userId,{times:next,enabled:Object.keys(next).length>0});
   setStatus(value);setTimes(value.times);
   setMessage(action==='test'?'테스트 알림을 보냈어요.':value.subscribed?'식사 알림 설정을 저장했어요.':'식사 알림이 꺼져 있어요.');
  }catch(e){setError(e instanceof Error?e.message:'알림 설정에 실패했어요.');}finally{setBusy(false);}
 }
 return <section className="mr-card" aria-label="앱 식사 알림">
  <header><div><span className="mr-kicker">앱 식사 알림</span><h3>밥 먹을 시간을 알려 드려요</h3></div>
   <button type="button" role="switch" aria-label="앱 식사 알림 켜기" aria-checked={Boolean(status?.subscribed)} className="mr-switch" disabled={busy||!userId} onClick={()=>void run(status?.subscribed?'disable':'enable',Object.keys(times).length?times:DEFAULT_NATIVE_TIMES)}><span aria-hidden="true"/></button></header>
  <p className="mr-note">알림을 허용하면 기본 점심 12시·저녁 6시 30분에 알려 드려요. 앱을 닫아도 받을 수 있고, 시간은 한국 시간 기준이에요.</p>
  <ul className={`mr-times${status?.subscribed?'':' is-off'}`}>{slots.map(([slot,label,fallback])=><li key={slot}>
   <label className="mr-slot"><input type="checkbox" checked={Boolean(times[slot])} disabled={busy} onChange={e=>{const next={...times};if(e.target.checked)next[slot]=fallback;else delete next[slot];setTimes(next);if(status?.subscribed)void run('settings',next);}}/>{label}</label>
   <input type="time" aria-label={`${label} 알림 시간`} value={times[slot]??fallback} disabled={busy||!times[slot]} onChange={e=>{const next={...times,[slot]:e.target.value};setTimes(next);if(status?.subscribed)void run('settings',next);}}/>
  </li>)}</ul>
  {status&&!status.permissionGranted&&<p className="mr-note">기기 설정에서 끼니플랜 알림을 허용한 뒤 알림을 켜 주세요.</p>}
  {status?.configured===false&&<p className="mr-note">서버 알림 연결을 준비 중이에요.</p>}
  {error&&<p role="alert" className="mr-error">{error}</p>}{message&&<p role="status" className="mr-msg">{message}</p>}
  {status?.subscribed&&<button type="button" className="mr-test" disabled={busy} onClick={()=>void run('test')}>테스트 알림 보내기</button>}
  <small className="mr-foot">인터넷 연결이 필요하고 기기·서버 상황에 따라 도착이 늦을 수 있어요. 로그아웃하면 이 기기의 발송을 멈춰요.</small>
 </section>;
}
