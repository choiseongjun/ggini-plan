"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {AuthScreen} from '../../auth-screen';
import '../style.css';
import '../collect/style.css';

type Row = {foodCode:string;itemName:string;representativeName:string;categoryLarge:string|null;datasetLabel:string;basisAmount:string;caloriesKcal:number|null;proteinG:number|null;fatG:number|null;carbohydratesG:number|null;sugarG:number|null;sodiumMg:number|null;sampleCount:number};
type Ingredient = {role:string;grams:number};
type Proposal = {foodCode:string;dishName:string;roles:Ingredient[];confidence:'high'|'medium'|'low';note:string;status:'draft'|'approved'};
const LIMIT = 50;
const roleLabels:Record<string,string>={rice:'조리된 밥',tofu:'단단한 두부',eggs:'생달걀',chicken:'익힌 닭가슴살',vegetables:'볶음용 채소',beef:'양념 소불고기',pork:'양념 돼지불고기',belly:'구이용 삼겹살',onion:'양파',mushroom:'표고버섯',cabbage:'양배추',rawPork:'볶음용 생돼지고기',rawBeef:'불고기용 생소고기',rawChicken:'생닭가슴살',fish:'구이용 순살 생선',potato:'감자',zucchini:'애호박'};

export default function FoodSafetyReferencePage() {
 const router = useRouter();
 const [login, setLogin] = useState(false), [loginAttempt, setLoginAttempt] = useState(0);
 const [query, setQuery] = useState(''), [label, setLabel] = useState('all');
 const [rows, setRows] = useState<Row[]>([]), [total, setTotal] = useState<number | null>(null);
 const [busy, setBusy] = useState(false), [error, setError] = useState('');
 const [proposals, setProposals] = useState<Record<string, Proposal>>({});
 const [synthBusy, setSynthBusy] = useState<string>('');
 const [synthError, setSynthError] = useState<Record<string, string>>({});

 async function load(offset: number, replace: boolean) {
  setBusy(true); setError('');
  try {
   const params = new URLSearchParams({limit: String(LIMIT), offset: String(offset)});
   if (query.trim()) params.set('q', query.trim());
   if (label !== 'all') params.set('label', label);
   const r = await fetch(`/api/admin/foodsafety-reference?${params}`, {cache: 'no-store'});
   if (r.status === 401 || r.status === 403) { setLogin(true); return; }
   const data = await r.json();
   if (!r.ok) throw new Error(data.error);
   setRows(prev => replace ? data.rows : [...prev, ...data.rows]);
   setTotal(data.total);
  } catch (e) { setError(e instanceof Error ? e.message : '조회 실패'); }
  finally { setBusy(false); }
 }
 useEffect(() => { void Promise.resolve().then(() => load(0, true)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

 async function synthesize(foodCode: string) {
  setSynthBusy(foodCode); setSynthError(prev => ({...prev, [foodCode]: ''}));
  try {
   const r = await fetch('/api/admin/foodsafety-synthesis', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({foodCode})});
   const data = await r.json();
   if (!r.ok) throw new Error(data.error);
   setProposals(prev => ({...prev, [foodCode]: data}));
  } catch (e) { setSynthError(prev => ({...prev, [foodCode]: e instanceof Error ? e.message : '제안 실패'})); }
  finally { setSynthBusy(''); }
 }
 function updateGrams(foodCode: string, index: number, grams: number) {
  setProposals(prev => { const p = prev[foodCode]; if (!p) return prev; const roles = p.roles.map((r, i) => i === index ? {...r, grams} : r); return {...prev, [foodCode]: {...p, roles}}; });
 }
 async function approve(foodCode: string) {
  const proposal = proposals[foodCode]; if (!proposal) return;
  setSynthBusy(foodCode); setSynthError(prev => ({...prev, [foodCode]: ''}));
  try {
   const r = await fetch('/api/admin/foodsafety-synthesis', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({foodCode, roles: proposal.roles})});
   const data = await r.json();
   if (!r.ok) throw new Error(data.error);
   setProposals(prev => ({...prev, [foodCode]: {...proposal, status: 'approved'}}));
  } catch (e) { setSynthError(prev => ({...prev, [foodCode]: e instanceof Error ? e.message : '승인 실패'})); }
  finally { setSynthBusy(''); }
 }

 if (login) return <main className="admin-login-shell"><AuthScreen admin initialError={error} onExplore={() => router.push('/')} onSuccess={() => { setError(''); setLogin(false); setLoginAttempt(v => v + 1); void load(0, true); }} key={loginAttempt}/></main>;

 return <main className="admin-shell">
  <header className="admin-header"><div><span className="admin-kicker">KKINIPLAN · CONTENT MANAGER</span><h1>영양성분DB 조회</h1><p>식약처 공공DB 스냅샷(가공식품·음식)을 이름으로 검색해 값을 확인해요. &ldquo;AI 요리법 제안&rdquo;으로 재료 구성을 만들고 승인하면 실제 추천에 반영돼요.</p></div><Link href="/">앱으로 돌아가기 ↗</Link></header>
  <nav className="admin-collection-tabs" aria-label="상품 관리 메뉴"><Link href="/admin">상품·영양 관리</Link><Link href="/admin/collect">상품 수집</Link><Link href="/admin/deals">핫딜 수집·관리</Link><Link href="/admin/foodsafety" aria-current="page">영양DB 조회</Link><Link href="/admin/recipe-optimizer">유사 레시피 생성기</Link><Link href="/admin/menus">추천 메뉴</Link><Link href="/admin/menu-stats">메뉴 인기</Link></nav>
  <section className="oasis-collection">
   <div className="catalog-collection-controls">
    <label>검색어<input type="text" maxLength={60} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void load(0, true); }}/></label>
    <label>구분<select value={label} onChange={e => setLabel(e.target.value)}><option value="all">전체</option><option value="가공식품">가공식품</option><option value="음식">음식</option></select></label>
   </div>
   <button type="button" disabled={busy} onClick={() => void load(0, true)}>{busy && !rows.length ? '조회 중…' : '조회'}</button>
   {error && <p role="alert">{error}</p>}
   {total !== null && <p role="status">총 {total.toLocaleString()}건 중 {rows.length.toLocaleString()}건 표시</p>}
   {rows.length > 0 && <ul className="foodsafety-matches">{rows.map(r => {
    const proposal = proposals[r.foodCode];
    return <li key={r.foodCode}>
     <strong>{r.itemName}</strong><span> · {r.datasetLabel}</span>{r.categoryLarge && <span> · {r.categoryLarge}</span>}<span> · {r.basisAmount} 기준</span>{r.sampleCount > 1 && <span> · 표본 {r.sampleCount}건 평균</span>}
     <small>열량 {r.caloriesKcal ?? '-'}kcal · 탄수 {r.carbohydratesG ?? '-'}g · 단백 {r.proteinG ?? '-'}g · 지방 {r.fatG ?? '-'}g · 당류 {r.sugarG ?? '-'}g · 나트륨 {r.sodiumMg ?? '-'}mg</small>
     <button type="button" disabled={synthBusy === r.foodCode} onClick={() => void synthesize(r.foodCode)}>{synthBusy === r.foodCode && !proposal ? '제안 받는 중…' : proposal ? '🤖 다시 제안받기' : '🤖 AI 요리법 제안받기'}</button>
     {synthError[r.foodCode] && <p role="alert">{synthError[r.foodCode]}</p>}
     {proposal && <div className="dish-nutrition-insight-body">
      <p>신뢰도 {proposal.confidence === 'high' ? '높음' : proposal.confidence === 'medium' ? '중간' : '낮음'} · {proposal.note}</p>
      {proposal.roles.length === 0 ? <p className="body-note">이 재료 목록으로는 구성할 수 없어요.</p> : <>
       <ul>{proposal.roles.map((ing, i) => <li key={i}>
        {roleLabels[ing.role] ?? ing.role}
        <input type="number" min={1} max={2000} value={ing.grams} disabled={proposal.status === 'approved'} onChange={e => updateGrams(r.foodCode, i, Number(e.target.value))}/>g
       </li>)}</ul>
       <button type="button" disabled={synthBusy === r.foodCode || proposal.status === 'approved'} onClick={() => void approve(r.foodCode)}>{proposal.status === 'approved' ? '승인 완료 ✓' : synthBusy === r.foodCode ? '승인 중…' : '이 구성 승인하기'}</button>
      </>}
     </div>}
    </li>;
   })}</ul>}
   {total !== null && rows.length < total && <button type="button" disabled={busy} onClick={() => void load(rows.length, false)}>{busy ? '불러오는 중…' : '더 보기'}</button>}
  </section>
 </main>;
}
