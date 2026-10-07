'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {AuthScreen} from '../auth-screen';
import {Button,LinkButton,Notice} from '../components/ui';
import {parseTasteSave,tasteSaveKey,type TasteSave} from '../../lib/pending-taste-save';
import {trackAnalytics} from '../../lib/analytics';
import {invalidateJson} from '../../lib/client-cache';

export function useMealSave(){
 const [pending,setPending]=useState<TasteSave|null>(null),[auth,setAuth]=useState(false),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false),[message,setMessage]=useState('');
 const current=useRef<TasteSave|null>(null),lock=useRef(false),restored=useRef(false);
 const [savedName,setSavedName]=useState<string|null>(null);
 const clear=useCallback(()=>{current.current=null;setPending(null);try{sessionStorage.removeItem(tasteSaveKey);}catch{}},[]);
 const submit=useCallback(async(draft:TasteSave,afterLogin=false)=>{
  if(lock.current)return;lock.current=true;setBusy(true);setMessage('');
  try{
   const r=await fetch('/api/manual-meal-plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:draft.id,name:draft.name,day:draft.day,slot:draft.slot})});
   if(r.status===401){setAuth(true);trackAnalytics('save_login_viewed');return;}
   if(!r.ok)throw Error();
   clear();setAuth(false);setSaved(true);setSavedName(draft.name);setMessage(`식단에 저장했어요: ${draft.name} · ${draft.day} 저녁`);invalidateJson();trackAnalytics('taste_meal_saved');trackAnalytics(afterLogin?'save_after_login_completed':'save_completed');
  }catch{setAuth(false);setMessage('저장하지 못했어요. 선택한 메뉴는 유지돼요. 아래에서 다시 저장해 주세요.');trackAnalytics('save_failed');}
  finally{lock.current=false;setBusy(false);}
 },[clear]);
 useEffect(()=>{
  let active=true;
  async function resume(){
   let draft=current.current;
   if(!restored.current){restored.current=true;try{draft=parseTasteSave(sessionStorage.getItem(tasteSaveKey));if(!draft)sessionStorage.removeItem(tasteSaveKey);}catch{}if(draft){current.current=draft;setPending(draft);}}
   if(!draft||lock.current)return;
   try{const r=await fetch('/api/auth/me',{cache:'no-store'});const d=await r.json();if(!active||current.current?.id!==draft.id)return;
    if(r.ok&&d.user){trackAnalytics('save_login_succeeded');setAuth(false);void submit(draft,true);}else if(r.ok){setAuth(true);}
   }catch{/* The preserved draft can be retried explicitly. */}
  }
  void resume();const visible=()=>{if(document.visibilityState==='visible')void resume();};
  window.addEventListener('focus',resume);window.addEventListener('pageshow',resume);document.addEventListener('visibilitychange',visible);
  return()=>{active=false;window.removeEventListener('focus',resume);window.removeEventListener('pageshow',resume);document.removeEventListener('visibilitychange',visible);};
 },[submit]);
 function cancel(){clear();setAuth(false);setMessage('저장을 취소했어요. 메뉴는 다시 고를 수 있어요.');trackAnalytics('save_login_cancelled');}
 function save(name:string){
  if(lock.current)return;trackAnalytics('save_clicked');setSaved(false);
  const draft=current.current??{id:crypto.randomUUID(),name,day:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),slot:'dinner' as const,at:Date.now(),returnTo:window.location.pathname+window.location.search};
  current.current=draft;setPending(draft);try{sessionStorage.setItem(tasteSaveKey,JSON.stringify(draft));}catch{/* In-memory continuation still works for popup login. */}
  void submit(draft);
 }
 const authView=auth&&pending?<AuthScreen purpose={`선택한 메뉴: ${pending.name} · ${pending.day} 저녁. 로그인하면 다시 고르지 않아도 바로 저장돼요.`} onAuthEvent={event=>trackAnalytics(event==='started'?'save_login_started':event==='failed'?'save_login_failed':event==='consent_required'?'save_consent_required':'save_login_succeeded')} onSuccess={()=>{setAuth(false);if(current.current)void submit(current.current,true);}} onExplore={cancel}/>:null;
 const feedback=<>{message&&<Notice>{message}</Notice>}{!auth&&pending&&!busy&&<><Button onClick={()=>void submit(pending,true)}>선택한 메뉴 다시 저장</Button><Button variant="ghost" onClick={cancel}>저장 취소</Button></>}{saved&&<LinkButton href="/plan">저장한 식단 보기</LinkButton>}</>;
 return {save,authView,feedback,busy,saved,savedName,pending:pending!==null,resetSaved:()=>{setSaved(false);setSavedName(null);}};
}
