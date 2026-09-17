'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {feedbackKinds} from '../../../lib/service-feedback';
import '../../service-feedback.css';
type Item={id:string;kind:keyof typeof feedbackKinds;message:string;page:string;status:string;created_at:string};
export default function FeedbackAdmin(){
 const [items,setItems]=useState<Item[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[filter,setFilter]=useState('all'),[busy,setBusy]=useState('');
 async function load(){setLoading(true);setError('');try{const r=await fetch('/api/admin/feedback',{cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(d.error);setItems(d.items);}catch(e){setError(e instanceof Error?e.message:'불러오기 실패');}finally{setLoading(false);}}
 useEffect(()=>{let active=true;void fetch('/api/admin/feedback',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);if(active)setItems(d.items);}).catch(e=>{if(active)setError(e instanceof Error?e.message:'불러오기 실패');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 async function update(id:string,status:string){setBusy(id);setError('');try{const r=await fetch('/api/admin/feedback',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,status})});const d=await r.json();if(!r.ok||!d.saved)throw new Error(d.error??'저장하지 못했어요.');setItems(prev=>prev.map(i=>i.id===id?{...i,status}:i));}catch(e){setError(e instanceof Error?e.message:'저장 실패');}finally{setBusy('');}}
 return <main style={{maxWidth:760,margin:'0 auto',padding:24}}><Link href="/admin">관리자로 돌아가기</Link><h1>서비스 이용 의견</h1><p>최근 200건 · 사용자에게 공개되지 않습니다.</p><label>유형 <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">전체</option>{Object.entries(feedbackKinds).map(([k,v])=><option key={k} value={k}>{v} ({items.filter(i=>i.kind===k).length})</option>)}</select></label> <button onClick={()=>void load()}>새로고침</button>{loading&&<p role="status">불러오는 중…</p>}{error&&<p role="alert">{error} <Link href="/">앱에서 로그인</Link></p>}{!loading&&!error&&!items.length&&<p>아직 의견이 없어요.</p>}
  {items.filter(i=>filter==='all'||i.kind===filter).map(i=><article className="service-feedback" key={i.id}><strong>{feedbackKinds[i.kind]}</strong><p>{new Date(i.created_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} · {i.page}</p><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{i.message||'추가 내용 없이 반응만 남겼어요.'}</p><label>처리 상태 <select aria-label={`${i.id} 처리 상태`} disabled={!!busy} value={i.status} onChange={e=>void update(i.id,e.target.value)}><option value="new">새 의견</option><option value="reviewed">확인 중</option><option value="done">반영 완료</option></select></label></article>)}
 </main>;
}
