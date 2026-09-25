'use client';

import Link from 'next/link';
import Image from 'next/image';
import {useEffect, useMemo, useRef, useState} from 'react';
import '../style.css';
import './menus.css';

type Menu = {quality?:{action:string;reason:string;originalName:string};code: string; name: string; source: string; role: string | null; template: string; breakfast: boolean; withRice: boolean; included: boolean; reason: string | null;
 kcal: number | null; protein: number | null; carbs: number | null; sodium: number | null; price: number | null; image: string | null; ingredients: string[]; createdAt: string};
const SOURCES: Record<string, string> = {optimizer: '기존(정부DB)', 'gov-expansion': '정부DB 확장', 'ai-expansion': 'AI 추가'};
const ROLES: Record<string, string> = {main: '메인', soup: '국·찌개', 'one-bowl': '한 그릇', side: '반찬', other: '끼니 아님'};
const PAGE = 24;

export default function AdminMenus() {
 const [menus, setMenus] = useState<Menu[] | null>(null), [error, setError] = useState('');
 const [source, setSource] = useState('all'), [status, setStatus] = useState('included'), [query, setQuery] = useState(''), [sort, setSort] = useState('new');
 const [shown, setShown] = useState(PAGE), [open, setOpen] = useState<string | null>(null);
 const [reload, setReload] = useState(0);
 const [busy, setBusy] = useState<string | null>(null);
 const [messages, setMessages] = useState<Record<string,string>>({});
 const [photoFilter, setPhotoFilter] = useState('all');
 const [category, setCategory] = useState('all');
 const loadMoreRef = useRef<HTMLDivElement>(null);
 async function replacePhoto(m:Menu) {
  if(busy) return;
  setBusy(m.code); setMessages(v=>({...v,[m.code]:'사진 후보를 찾고 메뉴와 맞는지 확인하고 있어요…'}));
  try {
   const response=await fetch('/api/admin/menus/photo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:m.code})});
   const data=await response.json();if(!response.ok)throw new Error(data.error);
   if(data.changed) setMenus(v=>v?.map(row=>row.code===m.code?{...row,image:data.image}:row)??null);
   setMessages(v=>({...v,[m.code]:data.changed?'사진을 교체했어요. '+data.reason:'기존 사진을 유지했어요. '+data.reason}));
  }catch(e){setMessages(v=>({...v,[m.code]:e instanceof Error?e.message:'다시 시도해 주세요.'}));}
  finally{setBusy(null);}
 }
 useEffect(() => {
  const c = new AbortController();
  fetch('/api/admin/menus', {cache: 'no-store', signal: c.signal}).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); setMenus(d.menus); setError(''); })
   .catch((e) => { if (!c.signal.aborted) setError(e.message); });
  return () => c.abort();
 }, [reload]);

 const filtered = useMemo(() => {
  const q = query.trim().replace(/\s/g, '');
  return (menus ?? [])
   .filter((m) => photoFilter !== 'missing' || !m.image)
   .filter((m) => source === 'all' || m.source === source)
   .filter((m) => status === 'all' || (status === 'hold' ? ['hold','pending'].includes(m.quality?.action??'') : status === 'renamed' ? m.quality?.action==='rename' : status === 'included' ? m.included : !m.included))
   .filter((m) => !q || m.name.replace(/\s/g, '').includes(q) || m.quality?.originalName.replace(/\s/g,'').includes(q) || m.ingredients.some((i) => i.includes(q)))
   .sort((a, b) => sort === 'kcal' ? (b.kcal ?? 0) - (a.kcal ?? 0) : sort === 'sodium' ? (b.sodium ?? 0) - (a.sodium ?? 0) : sort === 'price' ? (b.price ?? 0) - (a.price ?? 0) : sort === 'name' ? a.name.localeCompare(b.name, 'ko') : b.createdAt.localeCompare(a.createdAt));
 }, [menus, source, status, query, sort, photoFilter]);

 const categories = useMemo(() => {
  const counts = new Map<string, number>();
  for (const m of filtered) { const key = m.role || 'unclassified'; counts.set(key, (counts.get(key) ?? 0) + 1); }
  return [...new Set([...Object.keys(ROLES), 'unclassified', ...counts.keys()])].map(key => ({key, label: ROLES[key] ?? (key === 'unclassified' ? '미분류' : key), count: counts.get(key) ?? 0}));
 }, [filtered]);
 const list = useMemo(() => filtered.filter(m => category === 'all' || (m.role || 'unclassified') === category), [filtered, category]);
 useEffect(() => {
  const target = loadMoreRef.current;
  if (!target || shown >= list.length) return;
  const observer = new IntersectionObserver(entries => {
   if (entries.some(entry => entry.isIntersecting)) {
    observer.disconnect();
    setShown(value => Math.min(value + PAGE, list.length));
   }
  }, {rootMargin: '600px 0px'});
  observer.observe(target);
  return () => observer.disconnect();
 }, [shown, list]);

 const count = (pred: (m: Menu) => boolean) => (menus ?? []).filter(pred).length;
 return <main className="admin-page menu-review-page">
  <nav className="admin-collection-tabs" aria-label="상품 관리 메뉴"><Link href="/admin">상품·영양 관리</Link><Link href="/admin/collect">상품 수집</Link><Link href="/admin/foodsafety">영양DB 조회</Link><Link href="/admin/recipe-optimizer">유사 레시피 생성기</Link><Link href="/admin/menus" aria-current="page">추천 메뉴</Link><Link href="/admin/meal-pairings">한 끼 조합</Link><Link href="/admin/menu-stats">메뉴 인기</Link><Link href="/admin/metrics">이용 지표</Link></nav>
  <header className="menu-review-heading"><div><span>MENU LIBRARY</span><h1>메뉴와 사진 관리</h1></div><Link href="/">홈으로</Link></header>
  <p className="menu-review-intro">사진과 메뉴 이름을 비교해 보세요. 맞지 않는 사진은 <strong>AI로 사진 바꾸기</strong>를 눌러 교체할 수 있어요.</p><p className="menu-review-hint">클릭한 메뉴만 AI로 검수해요 · 교체 결과는 바로 저장되며 홈에는 최대 10분 뒤 새로 불러올 때 반영돼요.</p>
  {error && <p role="alert">{error}</p>}
  {!menus && !error && <p>불러오는 중…</p>}
  {menus && <>
   <div className="menu-review-counts"><div><span>전체 메뉴</span><strong>{menus.length.toLocaleString()}<small>개</small></strong></div><div><span>추천에 사용 중</span><strong>{count(m=>m.included).toLocaleString()}<small>개</small></strong></div><div><span>사진 없음</span><strong>{count(m=>!m.image).toLocaleString()}<small>개</small></strong></div></div>
   <div className="menu-review-filters">
    <select value={source} onChange={(e) => { setSource(e.target.value); setShown(PAGE); }} aria-label="출처"><option value="all">전체 출처</option>{Object.entries(SOURCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
    <select value={status} onChange={(e) => { setStatus(e.target.value); setShown(PAGE); }} aria-label="추천 포함 여부"><option value="included">추천 포함</option><option value="excluded">제외된 것</option><option value="hold">메뉴 검수 보류</option><option value="renamed">이름 정리됨</option><option value="all">전체</option></select>
    <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="정렬"><option value="new">최근 추가 순</option><option value="name">이름 순</option><option value="kcal">칼로리 높은 순</option><option value="sodium">나트륨 높은 순</option><option value="price">재료비 높은 순</option></select>
    <select aria-label="사진 상태" value={photoFilter} onChange={e=>{setPhotoFilter(e.target.value);setShown(PAGE);}}><option value="all">모든 사진</option><option value="missing">사진 없음</option></select><input aria-label="메뉴·재료 검색" type="search" value={query} placeholder="메뉴·재료 검색" onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} style={{minWidth: 200}}/>
    <button type="button" onClick={() => setReload((n) => n + 1)}>새로고침</button>
    <span>{list.length}개</span>
   </div>
   <section className="menu-review-categories" aria-label="메뉴 카테고리">
    <h2>카테고리별 보기</h2><p>현재 검색·필터 조건의 개수예요. 반찬 등 제외된 메뉴도 보려면 ‘추천 포함 여부’를 ‘전체’로 바꿔 주세요.</p>
    <div><button type="button" aria-pressed={category === 'all'} onClick={() => {setCategory('all'); setShown(PAGE);}}>전체 <span>{filtered.length}</span></button>
    {categories.map(c => <button key={c.key} type="button" aria-pressed={category === c.key} onClick={() => {setCategory(c.key); setShown(PAGE);}}>{c.label} <span>{c.count}</span></button>)}</div>
   </section>
   {!list.length && <p className="menu-review-empty">검색 조건에 맞는 메뉴가 없어요.</p>}
   <div className="menu-review-grid">{list.slice(0,shown).map(m=><article className="menu-review-card" key={m.code}>
    <div className="menu-review-photo">{m.image?<Image key={m.image} src={m.image} alt={m.name} width={360} height={240} unoptimized onError={e=>{e.currentTarget.style.visibility='hidden';}}/>:<span>등록된 사진이 없어요</span>}<span className="menu-review-badge">{m.included?'추천에 사용 중':m.quality?.action==='hold'||m.quality?.action==='pending'?'검수 보류':'추천 제외'}</span></div>
    <div className="menu-review-body"><div className="menu-review-meta"><span className="menu-review-category" data-category={m.role || 'unclassified'}>{m.role?ROLES[m.role]??m.role:'미분류'}</span><small>{SOURCES[m.source]??m.source}</small></div><h2>{m.name.split('_').join(' · ')}</h2>
     <p className="menu-review-numbers">{m.kcal??'—'} kcal <span>·</span> {m.price===null?'재료비 미확인':m.price.toLocaleString('ko-KR')+'원'}</p>
     {m.quality?.action==='rename'&&<p className="menu-photo-message">이름 정리: {m.quality.originalName} → {m.name}</p>}
     {!m.included&&m.reason&&<p className="menu-photo-message">{m.reason}</p>}
     <button className="menu-photo-action" disabled={!!busy||m.quality?.action==='hold'||m.quality?.action==='pending'} onClick={()=>replacePhoto(m)}>{busy===m.code?'AI가 사진을 고르는 중…':'AI로 사진 바꾸기'}</button>
     {messages[m.code]&&<p className="menu-photo-message" role="status">{messages[m.code]}</p>}
     <button className="menu-detail-toggle" aria-expanded={open===m.code} onClick={()=>setOpen(open===m.code?null:m.code)}>영양·재료 자세히 {open===m.code?'접기':'보기'}</button>
     {open===m.code&&<div className="menu-review-details"><dl><div><dt>단백질</dt><dd>{m.protein??'—'} g</dd></div><div><dt>탄수화물</dt><dd>{m.carbs??'—'} g</dd></div><div><dt>나트륨</dt><dd>{m.sodium??'—'} mg</dd></div></dl><p>{m.ingredients.join(', ')||'등록된 재료가 없어요'}</p><small>{m.withRice?'밥 포함':'밥 별도 없음'} · {m.breakfast?'아침 추천 가능':'점심·저녁'}<br/>등록 {m.createdAt.slice(0,10)} · {m.code}</small></div>}
    </div></article>)}</div>
   {list.length > 0 && <div ref={loadMoreRef} className="menu-review-scroll-status" role="status">{Math.min(shown, list.length).toLocaleString()} / {list.length.toLocaleString()}개 표시 · {list.length > shown ? '아래로 스크롤하면 계속 보여드려요' : '모든 메뉴를 확인했어요'}</div>}
  </>}
 </main>;
}
