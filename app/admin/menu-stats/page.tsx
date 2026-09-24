'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import '../style.css';

type Row = {id: string; name: string; users: number; logs?: number; plans?: number; reason?: string; recommended?: number; eaten?: number};
type Stats = {days: number; totals: {recommended: number; logs: number}; eaten: Row[]; snacks: Row[]; saved: Row[]; swapped: Row[]; recommended: Row[]};

function Table({title, note, rows, cols}: {title: string; note?: string; rows: Row[]; cols: [string, (r: Row) => React.ReactNode][]}) {
 return <section style={{margin: '0 0 28px'}}>
  <h2 style={{fontSize: 18, margin: '0 0 4px'}}>{title}</h2>{note && <p style={{margin: '0 0 8px', fontSize: 13, color: '#5d6b58'}}>{note}</p>}
  {!rows.length ? <p style={{fontSize: 13}}>아직 기록이 없어요.</p> : <div style={{overflowX: 'auto'}}><table style={{width: '100%', textAlign: 'left', fontSize: 13}}>
   <thead><tr><th>#</th><th>메뉴</th>{cols.map(([label]) => <th key={label}>{label}</th>)}</tr></thead>
   <tbody>{rows.map((r, i) => <tr key={`${r.id}-${r.reason ?? ''}`}><td>{i + 1}</td><td>{r.name}</td>{cols.map(([label, cell]) => <td key={label}>{cell(r)}</td>)}</tr>)}</tbody>
  </table></div>}
 </section>;
}

export default function MenuStats() {
 const [days, setDays] = useState(30);
 const [stats, setStats] = useState<Stats | null>(null), [error, setError] = useState('');
 useEffect(() => {
  const c = new AbortController();
  fetch(`/api/admin/menu-stats?days=${days}`, {cache: 'no-store', signal: c.signal}).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setStats(d); setError(''); })
   .catch((e) => { if (!c.signal.aborted) setError(e.message); });
  return () => c.abort();
 }, [days]);
 const pct = (a = 0, b = 0) => b ? `${Math.round(a / b * 100)}%` : '-';
 return <main className="admin-page" style={{maxWidth: 1000, margin: 'auto', padding: 24}}>
  <nav className="admin-collection-tabs" aria-label="상품 관리 메뉴"><Link href="/admin">상품·영양 관리</Link><Link href="/admin/menus">추천 메뉴</Link><Link href="/admin/menu-stats" aria-current="page">메뉴 인기</Link><Link href="/admin/metrics">이용 지표</Link></nav>
  <h1>메뉴 인기</h1>
  <p>사람들이 무엇을 먹고, 저장하고, 바꿨는지. 로그인 사용자 기록 기준이에요.</p>
  <label>기간 <select value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={7}>최근 7일</option><option value={30}>최근 30일</option><option value={90}>최근 90일</option></select></label>
  {error && <p role="alert">{error}</p>}
  {!stats && !error && <p>불러오는 중…</p>}
  {stats && <>
   <p style={{margin: '12px 0 24px'}}>기간 중 추천한 끼니 {stats.totals.recommended.toLocaleString('ko-KR')}개 · 먹은 기록 {stats.totals.logs.toLocaleString('ko-KR')}건</p>
   <Table title="많이 먹은 메뉴" note="먹었어요(사진·직접·알림) 기록. 사람 수 → 기록 수 순." rows={stats.eaten} cols={[['사람', (r) => r.users], ['기록', (r) => r.logs]]}/>
   <Table title="추천 → 실제로 먹음" note="추천(교체 포함)한 뒤 14일 안에 같은 사람이 그 메뉴를 기록한 비율. 추천 기록은 이번 배포 이후부터 쌓여요." rows={stats.recommended} cols={[['추천', (r) => r.recommended], ['사람', (r) => r.users], ['먹음', (r) => r.eaten], ['전환율', (r) => pct(r.eaten, r.recommended)]]}/>
   <Table title="많이 저장한 메뉴" note="이대로 먹기·식단 저장에 들어간 메뉴." rows={stats.saved} cols={[['사람', (r) => r.users], ['저장', (r) => r.plans]]}/>
   <Table title="자주 바꾼 메뉴" note="끼니 바꾸기에서 이유를 고른 메뉴(사용자별 최근 50개, 기간 무관)." rows={stats.swapped} cols={[['이유', (r) => r.reason], ['사람', (r) => r.users]]}/>
   <Table title="많이 먹은 간식·음료·외식" rows={stats.snacks} cols={[['사람', (r) => r.users], ['기록', (r) => r.logs]]}/>
  </>}
 </main>;
}
