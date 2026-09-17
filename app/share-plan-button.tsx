'use client';
import {useState,useRef} from 'react';
import type {PlanConditions} from '../lib/shopping-plan';
import './shared-plan.css';
export function SharePlanButton({userId,onLogin,conditions,mealIds}:{userId?:string;onLogin:()=>void;conditions:PlanConditions;mealIds:string[]}){
 const [url,setUrl]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const lock=useRef(false);
 async function create(){
  if(!userId){onLogin();return;}if(lock.current)return;lock.current=true;setBusy(true);setMessage('');
  try{const r=await fetch('/api/shared-plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'share',conditions,mealIds})});const d=await r.json();if(!r.ok)throw new Error(d.error);setUrl(new URL(d.path,window.location.origin).href);setMessage('공유 링크를 만들었어요. 아래에서 복사하거나 공유해 주세요.');}
  catch(e){setMessage(e instanceof Error?e.message:'공유 링크를 만들지 못했어요.');}finally{lock.current=false;setBusy(false);}
 }
 return <section className="share-plan-actions" aria-label="내 식단 공유">
  <strong>잘 고른 한 끼, 같이 나눠요 🥄</strong><p>메뉴·일차별 일정·예상 식비만 공개해요. 링크를 받은 사람은 로그인 없이 볼 수 있어요.</p>
  {!url?<button type="button" disabled={busy} onClick={()=>void create()}>{busy?'링크 만드는 중…':userId?'내 식단 공유 링크 만들기':'로그인하고 내 식단 공유하기'}</button>:<>
   <label>공유 링크<input readOnly value={url} onFocus={e=>e.target.select()}/></label>
   <div><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(url);setMessage('링크를 복사했어요. 원하는 곳에 붙여 넣어 주세요.');}catch{setMessage('자동 복사가 안 돼요. 위 링크를 선택해서 직접 복사해 주세요.');}}}>링크 복사</button><button type="button" onClick={async()=>{try{if(!navigator.share){setMessage('이 브라우저에서는 링크 복사를 사용해 주세요.');return;}await navigator.share({title:'같이 먹어요 · 끼니플랜',text:'메뉴와 예상 식비를 확인해 보세요.',url});}catch(e){if(!(e instanceof Error&&e.name==='AbortError'))setMessage('공유 창을 열지 못했어요. 링크 복사를 사용해 주세요.');}}}>다른 앱으로 공유</button><a href={url} target="_blank" rel="noopener noreferrer">공유 화면 보기 ↗</a></div>
   <small>이 링크에는 지금 식단이 저장돼요. 이후 내 식단을 바꿔도 공유한 내용은 유지돼요.</small>
  </>}{message&&<p role="status">{message}</p>}
 </section>;
}
