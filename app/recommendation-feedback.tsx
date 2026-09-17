'use client';
import Link from 'next/link';
import {useRef,useState} from 'react';
import {recommendationFeedbackKinds} from '../lib/service-feedback';
import {recommendationFeedbackMessage} from '../lib/recommendation-feedback';
import type {PlanConditions} from '../lib/shopping-plan';
import './service-feedback.css';
type Kind=keyof typeof recommendationFeedbackKinds;
export function RecommendationFeedback({conditions,mealNames,page}:{conditions:PlanConditions;mealNames:string[];page:string}){
 const [note,setNote]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState<Kind|null>(null),[error,setError]=useState('');
 const lock=useRef(false),pending=useRef<{id:string;kind:Kind;message:string;page:string}|null>(null);
 async function send(kind:Kind){
  if(lock.current||done)return;
  lock.current=true;setBusy(true);setError('');
  const message=recommendationFeedbackMessage(conditions,mealNames,note);
  const old=pending.current;
  const payload=old&&old.kind===kind&&old.message===message?old:{id:crypto.randomUUID(),kind,message,page};pending.current=payload;
  try{
   const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   const data=await response.json();if(!response.ok||!data.saved)throw new Error(data.error??'의견을 저장하지 못했어요. 다시 눌러 주세요.');
   setDone(kind);pending.current=null;
  }catch(error){setError(error instanceof Error?error.message:'보내지 못했어요. 다시 눌러 주세요.');}
  finally{lock.current=false;setBusy(false);}
 }
 return <section className="service-feedback recommendation-feedback" aria-label="추천 평가와 상품 제보">
  <h3>이번 추천, 어떠셨나요?</h3>
  {done?<p role="status">‘{recommendationFeedbackKinds[done]}’ 의견을 보냈어요. 추천 개선에 참고할게요.</p>:<>
   <p>한 번만 눌러 알려주세요. 로그인 없이 보낼 수 있어요.</p>
   <details><summary>한마디 더 남기기 (선택)</summary><label className="feedback-message">추가 의견<textarea maxLength={300} rows={2} disabled={busy} value={note} onChange={e=>setNote(e.target.value)} placeholder="어떤 메뉴가 있으면 좋을까요?"/></label></details>
   <div className="recommendation-reactions">{Object.entries(recommendationFeedbackKinds).map(([kind,label])=><button key={kind} type="button" disabled={busy} onClick={()=>void send(kind as Kind)}>{label}</button>)}</div>
   {busy&&<p role="status">의견을 보내는 중이에요…</p>}{error&&<p role="alert">{error}</p>}
   <small>선택한 반응·추천 메뉴·예산·입력한 의견은 관리자에게만 전달돼요. 추천이 즉시 바뀌지는 않아요.</small>
  </>}
  <div className="recommendation-product-tip"><strong>찾는 상품이 없나요?</strong><p>판매 링크와 영양성분표 사진을 제보해 주세요. 검토 후 상품과 영양정보를 보완할게요.</p><Link href="/submissions#submit">상품·영양정보 제보하기 →</Link><small>상품 제보는 로그인 후 이용할 수 있어요.</small></div>
 </section>;
}
