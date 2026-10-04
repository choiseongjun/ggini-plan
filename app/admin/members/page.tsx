'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
type Member={id:string;name:string;email:string;created_at:string;last_login_at:string|null};
const time=(value:string|null)=>value?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'medium',hour12:false}).format(new Date(value)):'기록 없음';
export default function Members(){
 const [members,setMembers]=useState<Member[]>([]),[next,setNext]=useState<string|null>(null),[before,setBefore]=useState<string|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();fetch(`/api/admin/members${before?`?before=${before}`:''}`,{signal:controller.signal,cache:'no-store'}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error);setMembers(data.members);setNext(data.next);}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'조회 실패');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[before,retry]);
 function page(cursor:string|null){setLoading(true);setError('');setBefore(cursor);setRetry(n=>n+1);}
 return <main style={{maxWidth:1000,margin:'auto',padding:24}}><Link href="/admin">관리자로 돌아가기</Link><h1>회원 로그인 기록</h1><p>가입 최신순 · 시간은 한국 시간입니다.</p><p>인증에 성공해 세션이 발급된 마지막 시각입니다. 자동 로그인 유지나 단순 방문은 포함하지 않습니다. 도입 전 기록은 복원하지 않아 ‘기록 없음’으로 표시됩니다.</p>
 {error?<p role="alert">{error} <button onClick={()=>page(before)}>다시 시도</button></p>:loading?<p role="status">불러오는 중…</p>:<div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left',borderSpacing:'12px'}}><thead><tr><th>회원</th><th>이메일</th><th>가입 시각</th><th>마지막 로그인</th></tr></thead><tbody>{members.map(member=><tr key={member.id}><td>{member.name}</td><td>{member.email}</td><td>{time(member.created_at)}</td><td>{time(member.last_login_at)}</td></tr>)}</tbody></table>{!members.length&&<p>등록된 회원이 없습니다.</p>}</div>}
 <div style={{display:'flex',gap:16,marginTop:16}}><button disabled={loading} onClick={()=>page(null)}>처음으로 · 새로고침</button><button disabled={loading||!next} onClick={()=>page(next)}>다음 50명</button></div></main>;
}
