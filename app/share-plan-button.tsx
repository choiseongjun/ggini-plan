'use client';
import {useState,useRef} from 'react';
import type {PlanConditions} from '../lib/shopping-plan';
import './shared-plan.css';
export function SharePlanButton({userId,onLogin,conditions,mealIds,disabled=false}:{disabled?:boolean;userId?:string;onLogin:()=>void;conditions:PlanConditions;mealIds:string[]}){
 const [url,setUrl]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const lock=useRef(false);
 async function create(){
  if(disabled)return;if(!userId){onLogin();return;}if(lock.current)return;lock.current=true;setBusy(true);setMessage('');
  try{const r=await fetch('/api/shared-plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'share',conditions,mealIds})});const d=await r.json();if(!r.ok)throw new Error(d.error);setUrl(new URL(d.path,window.location.origin).href);setMessage('공유 링크를 만들었어요. 아래에서 복사하거나 공유해 주세요.');}
  catch(e){setMessage(e instanceof Error?e.message:'공유 링크를 만들지 못했어요.');}finally{lock.current=false;setBusy(false);}
 }
 return <section className="share-plan-actions" aria-label="내 식단 공유">
  <div className="share-plan-heading"><span aria-hidden="true">↗</span><div><strong>이번 식단, 같이 볼까요?</strong><p>{conditions.people??1}명 · {mealIds.length}개 메뉴를 링크 하나로 보내요.</p></div></div><p>받는 사람은 로그인 없이 메뉴를 볼 수 있어요. 신체 정보·개인 목표·식사 기록은 공유하지 않아요.</p>
  {!url?<button className="share-plan-primary" type="button" disabled={busy||disabled} onClick={()=>void create()}>{busy?'링크 만드는 중…':userId?'식단 공유하기':'로그인하고 식단 공유하기'}</button>:<>
   <label>공유 링크<input readOnly value={url} onFocus={e=>e.target.select()}/></label>
   <div><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(url);setMessage('링크를 복사했어요. 원하는 곳에 붙여 넣어 주세요.');}catch{setMessage('자동 복사가 안 돼요. 위 링크를 선택해서 직접 복사해 주세요.');}}}>링크 복사</button><button type="button" onClick={async()=>{try{if(!navigator.share){setMessage('이 브라우저에서는 링크 복사를 사용해 주세요.');return;}await navigator.share({title:'같이 먹어요 · 끼니플랜',text:`이번에 이렇게 먹으려고 해요. ${conditions.people??1}명 식단 메뉴를 같이 봐요.`,url});}catch(e){if(!(e instanceof Error&&e.name==='AbortError'))setMessage('공유 창을 열지 못했어요. 링크 복사를 사용해 주세요.');}}}>다른 앱으로 공유</button><a href={url} target="_blank" rel="noopener noreferrer">공유 화면 보기 ↗</a></div>
   <small>이 링크에는 지금 식단이 저장돼요. 이후 내 식단을 바꿔도 공유한 내용은 유지돼요.</small>
  </>}{message&&<p role="status">{message}</p>}
 </section>;
}
