'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
const labels:Record<string,string>={visit:'방문',generated:'추천 완료',swapped:'메뉴 교체',seller:'판매처 이동',returned:'재방문'};
export default function Metrics(){
 const [rows,setRows]=useState<{day:string;event:string;visitors:number}[]|null>(null),[error,setError]=useState('');
 useEffect(()=>{const c=new AbortController();fetch('/api/admin/planner-metrics',{signal:c.signal,cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);return d.rows;}).then(setRows).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[]);
 return <main style={{maxWidth:900,margin:'auto',padding:24}}><Link href="/admin">관리자로 돌아가기</Link><h1>추천·장보기 이용 흐름</h1><p>최근 30일 · 한국 시간 · 한국 홈·장바구니 이용 기준</p><p>각 행동을 한 익명 브라우저를 하루 한 번 집계해요. 재방문은 이전 날짜 방문 기록이 있는 브라우저예요. 브라우저·기기 변경, 저장소 삭제에 따라 중복 또는 누락될 수 있어요.</p><p>행동별 집계이며 순서가 검증된 전환율이나 실제 구매 수치는 아니에요.</p>{error?<p role="alert">{error}</p>:rows===null?<p>불러오는 중…</p>:rows.length===0?<p>아직 집계된 이용 기록이 없어요.</p>:<div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left'}}><caption>날짜별 행동을 한 브라우저 수</caption><thead><tr><th>날짜</th>{Object.values(labels).map(l=><th key={l}>{l}</th>)}</tr></thead><tbody>{[...new Set(rows.map(r=>r.day))].map(day=><tr key={day}><th>{day}</th>{Object.keys(labels).map(event=><td key={event}>{rows.find(r=>r.day===day&&r.event===event)?.visitors??0}</td>)}</tr>)}</tbody></table></div>}</main>;
}
