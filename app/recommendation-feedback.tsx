'use client';
import Link from 'next/link';
import {useRef,useState} from 'react';
import {recommendationFeedbackKinds} from '../lib/service-feedback';
import {recommendationFeedbackMessage} from '../lib/recommendation-feedback';
import type {PlanConditions} from '../lib/shopping-plan';
import './service-feedback.css';
import './recommendation-feedback.css';
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
 return <section className="recommendation-followup" aria-label="추천 평가와 상품 제보">
  <div className="recommendation-review">
  <span className="recommendation-eyebrow">더 잘 맞는 추천을 위해</span>
  <h3>이번 추천, 어떠셨나요?</h3>
  {done?<p className="recommendation-sent" role="status">‘{recommendationFeedbackKinds[done]}’ 의견을 보냈어요.<br/>다음 추천을 개선하는 데 참고할게요.</p>:<>
   <p className="recommendation-lead">가까운 반응을 누르면 바로 보내져요. 로그인은 필요 없어요.</p>
   <details className="recommendation-note"><summary>보내기 전에 한마디 더하기 <span>선택</span></summary><label className="feedback-message">추가 의견<textarea maxLength={300} rows={3} disabled={busy} value={note} onChange={e=>setNote(e.target.value)} placeholder="어떤 메뉴가 있으면 좋을까요?"/></label></details>
   <div className="recommendation-reactions">{Object.entries(recommendationFeedbackKinds).map(([kind,label])=><button key={kind} type="button" disabled={busy} onClick={()=>void send(kind as Kind)}>{label}</button>)}</div>
   {busy&&<p role="status">의견을 보내는 중이에요…</p>}{error&&<p role="alert">{error}</p>}
   <p className="recommendation-privacy">반응·추천 메뉴·예산·의견은 관리자에게만 전달돼요.<br/>의견을 보내도 현재 식단이 바로 바뀌지는 않아요.</p>
  </>}
  </div>
  <details className="recommendation-product-tip"><summary>찾는 상품이 없나요? · 상품 제보</summary><span className="recommendation-eyebrow">함께 채우는 메뉴 정보</span><h3>찾는 상품이 없나요?</h3><p>판매 링크와 영양성분표 사진을 남겨 주세요.<br/>검토 후 상품 정보를 보완할게요.</p><div className="recommendation-tip-action"><Link href="/submissions#submit">상품·영양정보 제보하기</Link><small>로그인 후 이용할 수 있어요</small></div></details>
 </section>;
}
