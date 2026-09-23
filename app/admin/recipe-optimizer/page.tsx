"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {AuthScreen} from '../../auth-screen';
import '../style.css';
import '../collect/style.css';

type DishRow = {foodCode:string;itemName:string;datasetLabel:string;basisAmount:string;caloriesKcal:number|null;proteinG:number|null;fatG:number|null;carbohydratesG:number|null;sugarG:number|null;sodiumMg:number|null};
type Template = {id:string;name:string;groups:{id:string;label:string;minPercent:number;maxPercent:number}[]};
type Recipe = {templateId:string;templateName:string;targetName:string;targetBasisAmount:string;totalGrams:number;ingredients:{ingredientId:string;name:string;grams:number}[];predicted:Record<string,number>;target:Record<string,number>;error:Record<string,number>;score:number};
type StoredRecipe = Recipe & {foodCode:string;createdAt:string};
const nutrientLabels:Record<string,string>={kcal:'열량(kcal)',carbohydrate:'탄수화물(g)',protein:'단백질(g)',fat:'지방(g)',sugar:'당류(g)',sodium:'나트륨(mg)'};

export default function RecipeOptimizerPage() {
 const router = useRouter();
 const [login, setLogin] = useState(false), [loginAttempt, setLoginAttempt] = useState(0);
 const [query, setQuery] = useState(''), [rows, setRows] = useState<DishRow[]>([]);
 const [templates, setTemplates] = useState<Template[]>([]);
 const [selected, setSelected] = useState<DishRow|null>(null), [templateId, setTemplateId] = useState('');
 const [busy, setBusy] = useState(false), [error, setError] = useState('');
 const [recipe, setRecipe] = useState<Recipe|null>(null);
 const [results, setResults] = useState<StoredRecipe[]>([]);
 const [batchBusy, setBatchBusy] = useState(false), [batchStatus, setBatchStatus] = useState('');

 async function loadResults() {
  try {
   const r = await fetch('/api/admin/recipe-optimizer', {cache: 'no-store'});
   if (r.status === 401 || r.status === 403) { setLogin(true); return; }
   const data = await r.json();
   if (r.ok) { setTemplates(data.templates); setResults(data.results); }
  } catch { /* list is best-effort at load; generation still works */ }
 }
 useEffect(() => { void Promise.resolve().then(loadResults); }, []);

 async function search() {
  setBusy(true); setError(''); setRecipe(null);
  try {
   const r = await fetch(`/api/admin/foodsafety-reference?q=${encodeURIComponent(query.trim())}&label=음식&limit=20`, {cache: 'no-store'});
   if (r.status === 401 || r.status === 403) { setLogin(true); return; }
   const data = await r.json();
   if (!r.ok) throw new Error(data.error);
   // ml-basis dishes measure volume, not mass — not usable as a gram-based recipe target.
   setRows((data.rows as DishRow[]).filter(row => row.basisAmount === '100g'));
  } catch (e) { setError(e instanceof Error ? e.message : '검색 실패'); }
  finally { setBusy(false); }
 }

 async function generate() {
  if (!selected) return;
  setBusy(true); setError(''); setRecipe(null);
  try {
   const r = await fetch('/api/admin/recipe-optimizer', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({foodCode: selected.foodCode, templateId: templateId || undefined})});
   const data = await r.json();
   if (!r.ok) throw new Error(data.error);
   setRecipe(data.recipe);
   void loadResults();
  } catch (e) { setError(e instanceof Error ? e.message : '생성 실패'); }
  finally { setBusy(false); }
 }
 async function generateAll() {
  setBatchBusy(true); setError(''); setBatchStatus('');
  try {
   const r = await fetch('/api/admin/recipe-optimizer', {method: 'PUT'});
   const data = await r.json();
   if (!r.ok) throw new Error(data.error);
   setBatchStatus(`전체 ${data.total}건 중 템플릿에 맞는 ${data.eligible}건 처리 · 저장 ${data.saved}건 · 실패 ${data.failed}건 · 더 이상 대상이 아니라 제거 ${data.removed}건`);
   void loadResults();
  } catch (e) { setError(e instanceof Error ? e.message : '일괄 생성 실패'); }
  finally { setBatchBusy(false); }
 }
 function nutrientRows(target: Record<string, number>, predicted: Record<string, number>, error: Record<string, number>) {
  return Object.keys(nutrientLabels).map(key => <tr key={key}>
   <td>{nutrientLabels[key]}</td><td>{target[key]}</td><td>{Math.round(predicted[key] * 100) / 100}</td>
   <td style={{color: Math.abs(error[key]) > target[key] * 0.2 ? '#b23' : undefined}}>{error[key] > 0 ? '+' : ''}{error[key]}</td>
  </tr>);
 }

 if (login) return <main className="admin-login-shell"><AuthScreen admin initialError={error} onExplore={() => router.push('/')} onSuccess={() => { setError(''); setLogin(false); setLoginAttempt(v => v + 1); }} key={loginAttempt}/></main>;

 return <main className="admin-shell">
  <header className="admin-header"><div><span className="admin-kicker">KKINIPLAN · CONTENT MANAGER</span><h1>유사 레시피 생성기 (실험)</h1><p>정부DB 음식의 목표 영양값에 원재료 조합을 맞춰 탐색해요. 실제 레시피 복원이 아니라 영양 구성이 비슷한 근사 조합이에요.</p></div><Link href="/">앱으로 돌아가기 ↗</Link></header>
  <nav className="admin-collection-tabs" aria-label="상품 관리 메뉴"><Link href="/admin">상품·영양 관리</Link><Link href="/admin/collect">상품 수집</Link><Link href="/admin/foodsafety">영양DB 조회</Link><Link href="/admin/recipe-optimizer" aria-current="page">유사 레시피 생성기</Link></nav>
  <section className="oasis-collection">
   <div className="catalog-collection-controls">
    <label>목표 음식 검색<input type="text" maxLength={60} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void search(); }}/></label>
   </div>
   <button type="button" disabled={busy} onClick={() => void search()}>검색</button>
   {error && <p role="alert">{error}</p>}
   {rows.length > 0 && <ul className="foodsafety-matches">{rows.map(r => <li key={r.foodCode}>
    <strong>{r.itemName}</strong> · {r.basisAmount} 기준
    <small>열량 {r.caloriesKcal}kcal · 탄수 {r.carbohydratesG}g · 단백 {r.proteinG}g · 지방 {r.fatG}g · 당류 {r.sugarG ?? '-'}g · 나트륨 {r.sodiumMg}mg</small>
    <button type="button" aria-pressed={selected?.foodCode === r.foodCode} onClick={() => setSelected(r)}>{selected?.foodCode === r.foodCode ? '선택됨 ✓' : '이 음식을 목표로 선택'}</button>
   </li>)}</ul>}

   {selected && <div className="dish-nutrition-insight-body">
    <p><strong>목표: {selected.itemName}</strong></p>
    <label>재료 구성 템플릿<select value={templateId} onChange={e => setTemplateId(e.target.value)}>
     <option value="">자동 선택 (음식명으로 매칭)</option>
     {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
    </select></label>
    <button type="button" disabled={busy} onClick={() => void generate()}>{busy ? '생성 중…' : '유사 레시피 생성'}</button>
   </div>}

   {recipe && <div className="dish-nutrition-insight-body">
    <p><strong>{recipe.targetName} 유사 레시피</strong> · {recipe.targetBasisAmount} 기준 · 템플릿: {recipe.templateName} · 총 {recipe.totalGrams}g</p>
    <ul>{recipe.ingredients.map(i => <li key={i.ingredientId}>{i.name} {i.grams}g</li>)}</ul>
    <table><thead><tr><th>영양소</th><th>목표</th><th>예측</th><th>오차</th></tr></thead>
     <tbody>{nutrientRows(recipe.target, recipe.predicted, recipe.error)}</tbody>
    </table>
    <small>이 재료 조합은 실제 {recipe.targetName}의 레시피가 아니라, 영양 구성만 비슷하게 근사한 참고용 조합이에요.</small>
   </div>}
  </section>

  <section className="oasis-collection">
   <h2>🗂️ 지금까지 생성한 유사 레시피 ({results.length}개)</h2>
   <p className="body-note">현재 템플릿(짜장류·볶음밥류·찌개·국탕·구이·나물·조림·튀김·죽·전)에 맞는 정부DB 음식을 한 번에 전부 생성·저장해요. 새 템플릿·재료를 추가한 뒤 다시 눌러도 안전해요 (기존 결과는 갱신만 됨).</p>
   <button type="button" disabled={batchBusy} onClick={() => void generateAll()}>{batchBusy ? '일괄 생성 중… (수백 건, 시간이 걸려요)' : '🔁 템플릿에 맞는 음식 전체 일괄 생성'}</button>
   {batchStatus && <p role="status">{batchStatus}</p>}
   {!results.length && <p className="body-note">아직 생성한 레시피가 없어요.</p>}
   {results.map(r => <details key={r.foodCode} className="dish-nutrition-insight">
    <summary>{r.targetName} · {r.targetBasisAmount} 기준 · 템플릿 {r.templateName} · {new Date(r.createdAt).toLocaleString('ko-KR')}</summary>
    <div className="dish-nutrition-insight-body">
     <ul>{r.ingredients.map(i => <li key={i.ingredientId}>{i.name} {i.grams}g</li>)}</ul>
     <table><thead><tr><th>영양소</th><th>목표</th><th>예측</th><th>오차</th></tr></thead>
      <tbody>{nutrientRows(r.target, r.predicted, r.error)}</tbody>
     </table>
    </div>
   </details>)}
  </section>
 </main>;
}
