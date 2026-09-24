'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
const labels:Record<string,string>={visit:'방문',generated:'추천 완료',swapped:'메뉴 교체',seller:'판매처 이동',returned:'재방문',photo_logged:'사진 기록',weight_logged:'체중 기록',push_enabled:'알림 켬',push_opened:'알림으로 들어옴',push_logged:'알림으로 들어와 기록',push_action_logged:'알림 버튼으로 바로 기록',snack_logged:'간식·음료 기록',eat_out_used:'지금 뭐 먹지'};
export default function Metrics(){
 const [rows,setRows]=useState<{day:string;event:string;visitors:number}[]|null>(null),[error,setError]=useState('');
 const [habit,setHabit]=useState<{weeks:{week:number;active:number;habit:number}[];members:number;today:string}|null>(null);
 useEffect(()=>{const c=new AbortController();fetch('/api/admin/planner-metrics',{signal:c.signal,cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setHabit({weeks:d.habit??[],members:d.members??0,today:d.today});return d.rows;}).then(setRows).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[]);
 return <main style={{maxWidth:900,margin:'auto',padding:24}}><Link href="/admin">관리자로 돌아가기</Link><h1>추천·장보기 이용 흐름</h1>{habit&&<HabitTable {...habit}/>}<p>최근 30일 · 한국 시간 · 한국 홈·장바구니 이용 기준</p><p>각 행동을 한 익명 브라우저를 하루 한 번 집계해요. 재방문은 이전 날짜 방문 기록이 있는 브라우저예요. 브라우저·기기 변경, 저장소 삭제에 따라 중복 또는 누락될 수 있어요.</p><p>행동별 집계이며 순서가 검증된 전환율이나 실제 구매 수치는 아니에요.</p>{error?<p role="alert">{error}</p>:rows===null?<p>불러오는 중…</p>:rows.length===0?<p>아직 집계된 이용 기록이 없어요.</p>:<div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left'}}><caption>날짜별 행동을 한 브라우저 수</caption><thead><tr><th>날짜</th>{Object.values(labels).map(l=><th key={l}>{l}</th>)}</tr></thead><tbody>{[...new Set(rows.map(r=>r.day))].map(day=><tr key={day}><th>{day}</th>{Object.keys(labels).map(event=><td key={event}>{rows.find(r=>r.day===day&&r.event===event)?.visitors??0}</td>)}</tr>)}</tbody></table></div>}</main>;
}

// 1순위 목표 지표: 주 3일 이상 기록한 회원 비율. 코칭은 이 비율이 30%를 넘은 뒤에 시작한다.
function HabitTable({weeks,members,today}:{weeks:{week:number;active:number;habit:number}[];members:number;today:string}){
 const shift=(days:number)=>{const d=new Date(`${today}T00:00:00Z`);d.setUTCDate(d.getUTCDate()-days);return `${d.getUTCMonth()+1}/${d.getUTCDate()}`;};
 const pct=(a:number,b:number)=>b?`${Math.round(a/b*100)}%`:'-';
 return <section style={{margin:'20px 0 28px',padding:16,border:'1px solid #dfe6da',borderRadius:12}}>
  <h2 style={{margin:'0 0 6px',fontSize:18}}>기록 습관 · 주 3일 이상 기록한 회원</h2>
  <p style={{margin:'0 0 12px',fontSize:13,color:'#5d6b58'}}>목표: 기록한 회원 중 30% 이상. 기록한 날은 한국 시간 기준, 취소한 기록은 빼요. 전체 회원 {members.toLocaleString('ko-KR')}명.</p>
  <table style={{width:'100%',textAlign:'left'}}><thead><tr><th>기간</th><th>기록한 회원</th><th>주 3일 이상</th><th>기록 회원 중</th><th>전체 회원 중</th></tr></thead>
  <tbody>{[0,1,2,3].map(week=>{const w=weeks.find(x=>x.week===week)??{active:0,habit:0};return <tr key={week}><th>{shift(week*7+6)}~{shift(week*7)}{week===0?' (이번 주)':''}</th><td>{w.active}</td><td>{w.habit}</td><td><b>{pct(w.habit,w.active)}</b></td><td>{pct(w.habit,members)}</td></tr>;})}</tbody></table>
 </section>;
}
