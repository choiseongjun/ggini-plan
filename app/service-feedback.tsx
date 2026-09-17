'use client';
import {useRef,useState} from 'react';
import {serviceFeedbackKinds as feedbackKinds} from '../lib/service-feedback';
import './service-feedback.css';
export function ServiceFeedback({page}:{page:string}){
 const [kind,setKind]=useState<keyof typeof feedbackKinds>('useful'),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState('');
 const pending=useRef<{id:string;kind:string;message:string;page:string}|null>(null),lock=useRef(false);
 async function send(){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  const old=pending.current;
  const payload=old&&old.kind===kind&&old.message===message&&old.page===page?old:{id:crypto.randomUUID(),kind,message,page};pending.current=payload;
  try{const r=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.error);setDone(true);pending.current=null;}
  catch(e){setError(e instanceof Error?e.message:'보내지 못했어요. 다시 시도해 주세요.');}finally{lock.current=false;setBusy(false);}
 }
 return <details className="service-feedback"><summary>💬 써보니 어땠나요? <span>의견 남기기</span></summary>
  {done?<div role="status"><strong>의견 고마워요 🌱</strong><p>보내주신 의견을 확인하고 개선에 참고할게요.</p><button type="button" onClick={()=>{setDone(false);setMessage('');}}>다른 의견 남기기</button></div>:<form onSubmit={e=>{e.preventDefault();void send();}}>
   <fieldset disabled={busy}><legend>어떤 경험이었나요?</legend><div className="feedback-kinds">{Object.entries(feedbackKinds).map(([key,label])=><label key={key}><input type="radio" name="feedback-kind" value={key} checked={kind===key} onChange={()=>setKind(key as keyof typeof feedbackKinds)}/>{key==='useful'?'🌱':key==='difficult'?'🩹':'💡'} {label}</label>)}</div>
   <label className="feedback-message">조금 더 알려주세요 (선택)<textarea rows={3} maxLength={1000} value={message} onChange={e=>setMessage(e.target.value)} placeholder={kind==='useful'?'어떤 부분이 도움이 됐나요?':kind==='difficult'?'어느 화면에서 무엇이 불편했나요?':'어떤 기능이 있으면 더 자주 쓸 것 같나요?'}/></label>
   <small>로그인 없이 보낼 수 있어요. 의견과 현재 화면 주소는 관리자에게만 전달돼요. 연락처 등 개인정보는 적지 말아 주세요.</small>
   <button type="submit">{busy?'보내는 중…':'의견 보내기'}</button></fieldset>{error&&<p role="alert">{error}</p>}
  </form>}
 </details>;
}
