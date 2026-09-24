'use client';

import Link from 'next/link';
import Image from 'next/image';
import {Fragment, useEffect, useMemo, useState} from 'react';
import '../style.css';

type Menu = {code: string; name: string; source: string; role: string | null; template: string; breakfast: boolean; withRice: boolean; included: boolean; reason: string | null;
 kcal: number | null; protein: number | null; carbs: number | null; sodium: number | null; price: number | null; image: string | null; ingredients: string[]; createdAt: string};
const SOURCES: Record<string, string> = {optimizer: '기존(정부DB)', 'gov-expansion': '정부DB 확장', 'ai-expansion': 'AI 추가'};
const ROLES: Record<string, string> = {main: '메인', soup: '국·찌개', 'one-bowl': '한 그릇', side: '반찬', other: '끼니 아님'};
const PAGE = 100;

export default function AdminMenus() {
 const [menus, setMenus] = useState<Menu[] | null>(null), [error, setError] = useState('');
 const [source, setSource] = useState('all'), [status, setStatus] = useState('included'), [query, setQuery] = useState(''), [sort, setSort] = useState('new');
 const [shown, setShown] = useState(PAGE), [open, setOpen] = useState<string | null>(null);
 const [reload, setReload] = useState(0);
 useEffect(() => {
  const c = new AbortController();
  fetch('/api/admin/menus', {cache: 'no-store', signal: c.signal}).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setMenus(d.menus); setError(''); })
   .catch((e) => { if (!c.signal.aborted) setError(e.message); });
  return () => c.abort();
 }, [reload]);

 const list = useMemo(() => {
  const q = query.trim().replace(/\s/g, '');
  return (menus ?? [])
   .filter((m) => source === 'all' || m.source === source)
   .filter((m) => status === 'all' || (status === 'included' ? m.included : !m.included))
   .filter((m) => !q || m.name.replace(/\s/g, '').includes(q) || m.ingredients.some((i) => i.includes(q)))
   .sort((a, b) => sort === 'kcal' ? (b.kcal ?? 0) - (a.kcal ?? 0) : sort === 'sodium' ? (b.sodium ?? 0) - (a.sodium ?? 0) : sort === 'price' ? (b.price ?? 0) - (a.price ?? 0) : sort === 'name' ? a.name.localeCompare(b.name, 'ko') : b.createdAt.localeCompare(a.createdAt));
 }, [menus, source, status, query, sort]);

 const count = (pred: (m: Menu) => boolean) => (menus ?? []).filter(pred).length;
 return <main className="admin-page" style={{maxWidth: 1100, margin: 'auto', padding: 24}}>
  <nav className="admin-collection-tabs" aria-label="상품 관리 메뉴"><Link href="/admin">상품·영양 관리</Link><Link href="/admin/collect">상품 수집</Link><Link href="/admin/foodsafety">영양DB 조회</Link><Link href="/admin/recipe-optimizer">유사 레시피 생성기</Link><Link href="/admin/menus" aria-current="page">추천 메뉴</Link><Link href="/admin/menu-stats">메뉴 인기</Link><Link href="/admin/metrics">이용 지표</Link></nav>
  <h1>추천 메뉴</h1>
  <p>홈 추천에 실제로 쓰이는 메뉴예요. 지금 DB와 분류 파일 기준으로 계산해요(추천 화면은 최대 10분 늦게 반영). 분류 결과는 배포해야 운영 추천에 반영돼요.</p>
  {error && <p role="alert">{error}</p>}
  {!menus && !error && <p>불러오는 중…</p>}
  {menus && <>
   <table style={{margin: '12px 0 20px'}}><thead><tr><th>출처</th><th>추천 포함</th><th>제외</th><th>전체</th></tr></thead><tbody>
    {Object.entries(SOURCES).map(([key, label]) => <tr key={key}><th>{label}</th><td>{count((m) => m.source === key && m.included)}</td><td>{count((m) => m.source === key && !m.included)}</td><td>{count((m) => m.source === key)}</td></tr>)}
    <tr><th>합계</th><td><b>{count((m) => m.included)}</b></td><td>{count((m) => !m.included)}</td><td>{menus.length}</td></tr>
   </tbody></table>
   <div style={{display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12}}>
    <select value={source} onChange={(e) => { setSource(e.target.value); setShown(PAGE); }} aria-label="출처"><option value="all">전체 출처</option>{Object.entries(SOURCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
    <select value={status} onChange={(e) => { setStatus(e.target.value); setShown(PAGE); }} aria-label="추천 포함 여부"><option value="included">추천 포함</option><option value="excluded">제외된 것</option><option value="all">전체</option></select>
    <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="정렬"><option value="new">최근 추가 순</option><option value="name">이름 순</option><option value="kcal">칼로리 높은 순</option><option value="sodium">나트륨 높은 순</option><option value="price">재료비 높은 순</option></select>
    <input type="search" value={query} placeholder="메뉴·재료 검색" onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} style={{minWidth: 200}}/>
    <button type="button" onClick={() => setReload((n) => n + 1)}>새로고침</button>
    <span>{list.length}개</span>
   </div>
   <div style={{overflowX: 'auto'}}><table style={{width: '100%', textAlign: 'left', fontSize: 13}}>
    <thead><tr><th></th><th>메뉴</th><th>출처</th><th>역할</th><th>밥</th><th>아침</th><th>kcal</th><th>단백질</th><th>탄수</th><th>나트륨</th><th>재료비</th><th>상태</th></tr></thead>
    <tbody>{list.slice(0, shown).map((m) => <Fragment key={m.code}>
     <tr onClick={() => setOpen(open === m.code ? null : m.code)} style={{cursor: 'pointer', opacity: m.included ? 1 : .6}}>
      <td>{m.image ? <Image src={m.image} alt="" width={40} height={40} unoptimized style={{objectFit: 'cover', borderRadius: 6}}/> : '-'}</td>
      <td><b>{m.name.split('_').join(' · ')}</b></td><td>{SOURCES[m.source] ?? m.source}</td><td>{m.role ? ROLES[m.role] ?? m.role : '미분류'}</td>
      <td>{m.withRice ? '밥+' : '-'}</td><td>{m.breakfast ? '아침' : ''}</td>
      <td>{m.kcal ?? '-'}</td><td>{m.protein ?? '-'}</td><td>{m.carbs ?? '-'}</td><td>{m.sodium ?? '-'}</td><td>{m.price === null ? '-' : `${m.price.toLocaleString('ko-KR')}원`}</td>
      <td>{m.included ? '추천' : m.reason}</td>
     </tr>
     {open === m.code && <tr><td/><td colSpan={11} style={{background: '#f7f9f3', padding: 10}}>재료: {m.ingredients.join(', ') || '없음'}<br/><small>코드 {m.code} · 템플릿 {m.template} · 추가 {m.createdAt.slice(0, 10)}</small></td></tr>}
    </Fragment>)}</tbody>
   </table></div>
   {list.length > shown && <button type="button" onClick={() => setShown((s) => s + PAGE)} style={{marginTop: 12}}>더 보기 ({list.length - shown}개 남음)</button>}
  </>}
 </main>;
}
