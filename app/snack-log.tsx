'use client';

import {useEffect, useRef, useState} from 'react';
import type {FoodReference} from '../lib/food-reference';
import {trackPlanner} from '../lib/track-planner';
import {INTAKE_LOGGED_EVENT} from './record-progress';
import './snack-log.css';
import {MealPhotoLog} from './meal-photo-log';
import {validPortions} from '../lib/food-intake';

const portionsList = [[0.5, '반'], [1, '1회'], [1.5, '1.5'], [2, '2회']] as const;
const n = (v: number) => Math.round(v).toLocaleString('ko-KR');
const serving = (f: FoodReference) => `${n(f.servingAmount)}${f.servingUnit}`;

// 간식·디저트·음료·외식 기록: 이름으로 찾아 한 번에 남긴다. 기록이 쌓일수록 하루 섭취량(칼로리·당류)이 정확해진다.
export function SnackLog({onLogged,initialOpen=false,photo=false}: {onLogged: () => void;initialOpen?:boolean;photo?:boolean}) {
 const [open, setOpen] = useState(initialOpen);
 const [query, setQuery] = useState('');
 const [results, setResults] = useState<{q: string; items: FoodReference[]} | null>(null);
 const [recent, setRecent] = useState<FoodReference[]>([]);
 const [picked, setPicked] = useState<FoodReference | null>(null);
 const [portions, setPortions] = useState(1);
 const [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState('');
 const input = useRef<HTMLInputElement>(null);

 useEffect(() => {
  if (!open) return;
  let alive = true;
  fetch('/api/food-reference?recent=1', {cache: 'no-store'}).then((r) => r.ok ? r.json() : {items: []}).then((d) => { if (alive) setRecent(d.items ?? []); }).catch(() => {});
  input.current?.focus();
  return () => { alive = false; };
 }, [open]);
 const q = query.trim();
 useEffect(() => {
  if (!q) return;
  const controller = new AbortController();
  const timer = window.setTimeout(() => {
   fetch(`/api/food-reference?q=${encodeURIComponent(q)}`, {signal: controller.signal}).then((r) => r.json()).then((d) => setResults({q, items: d.items ?? []})).catch(() => {});
  }, 250);
  return () => { window.clearTimeout(timer); controller.abort(); };
 }, [q]);

 async function log(amount=portions) {
  if (!picked || !validPortions(amount)) return;
  setBusy(true); setError('');
  try {
   const r = await fetch('/api/food-intake', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'log', id: crypto.randomUUID(), version: 0, referenceCode: picked.code, portions:amount})});
   const d = await r.json();
   if (!r.ok) throw new Error(d.error);
   setDone(`${picked.name} 기록했어요${picked.kcal !== null ? ` · 약 ${n(picked.kcal * amount)}kcal` : ''}`);
   setPicked(null); setQuery(''); setResults(null); setPortions(1);
   trackPlanner('snack_logged');
   window.dispatchEvent(new CustomEvent(INTAKE_LOGGED_EVENT));
   onLogged();
  } catch (e) { setError(e instanceof Error ? e.message : '기록하지 못했어요.'); } finally { setBusy(false); }
 }

 if (!open) return <div className="snack-log-entry">
  <button type="button" className="snack-log-open" onClick={() => { setOpen(true); setDone(''); }}>간식·음료·외식도 기록하기</button>
  {done && <p className="snack-log-done" role="status">{done}</p>}
 </div>;

 const list = q ? (results?.q === q ? results.items : null) : recent;
 return <section className="snack-log" aria-label="간식·음료·외식 기록">
  <header><strong>무엇을 먹었어요?</strong><button type="button" aria-label="닫기" onClick={() => { setOpen(false); setPicked(null); setQuery(''); }}>
   <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
  {photo&&<p className="snack-log-note">음식을 고른 뒤 사진을 올리면 먹은 양을 추정해요. 사진 원본은 보관되지 않아요.</p>}
  <input ref={input} type="search" value={query} placeholder="예: 카페라떼, 치즈케이크, 스타벅스, 순대국밥" aria-label="음식 이름 검색" onChange={(e) => { setQuery(e.target.value); setPicked(null); }}/>
  {!q && recent.length > 0 && <span className="snack-log-label">최근에 기록한 것</span>}
  {q && list === null && <p className="snack-log-note">찾고 있어요…</p>}
  {q && list?.length === 0 && <p className="snack-log-note">찾는 음식이 없어요. 다른 이름으로 검색해 보세요.</p>}
  {!picked && list && list.length > 0 && <ul className="snack-log-list">{list.map((f) => <li key={f.code}>
   <button type="button" onClick={() => { setPicked(f); setPortions(1); }}>
    <span><strong>{f.name}</strong>{f.brand && <small>{f.brand}</small>}</span>
    <span className="snack-log-meta">{serving(f)}{f.kcal !== null && ` · ${n(f.kcal)}kcal`}{f.sugar !== null && f.sugar >= 1 && ` · 당류 ${n(f.sugar)}g`}</span>
   </button>
  </li>)}</ul>}
  {picked && <div className="snack-log-pick">
   <p><strong>{picked.name}</strong>{picked.brand && <small> {picked.brand}</small>}<span>1회 {serving(picked)} 기준</span></p>
   {photo&&<MealPhotoLog key={picked.code} referenceCode={picked.code} dishName={picked.name} disabled={busy} onManual={()=>void log()} onFallback={()=>void log(1)} onLogged={()=>{setPicked(null);setQuery('');setDone('사진으로 식사를 기록했어요. 아래에서 양을 수정할 수 있어요.');window.dispatchEvent(new CustomEvent(INTAKE_LOGGED_EVENT));onLogged();}}/>}
   <div className="snack-log-portions" role="radiogroup" aria-label="먹은 양">{portionsList.map(([value, label]) => <button type="button" role="radio" key={value} aria-checked={portions === value} onClick={() => setPortions(value)}>{label}</button>)}</div>
   <label className="snack-log-custom">먹은 양 직접 입력<input type="number" min="0.25" max="10" step="0.25" aria-label="먹은 양 직접 입력" value={portions||''} disabled={busy} onChange={e=>setPortions(Number(e.target.value))}/>회</label>
   <p className="snack-log-total" aria-live="polite">{!validPortions(portions)?'먹은 양을 0.25~10회, 0.25 단위로 입력해 주세요.':<>{picked.kcal !== null ? <>약 <b>{n(picked.kcal * portions)}</b>kcal</> : '칼로리 정보 없음'}{picked.sugar !== null && ` · 당류 ${n(picked.sugar * portions)}g`}{picked.sodium !== null && ` · 나트륨 ${n(picked.sodium * portions)}mg`}</>}</p>
   <div className="snack-log-actions"><button type="button" onClick={() => setPicked(null)}>다시 고르기</button><button type="button" className="snack-log-submit" disabled={busy||!validPortions(portions)} onClick={() => void log()}>{busy ? '기록 중…' : '기록하기'}</button></div>
  </div>}
  {done&&<p className="snack-log-done" role="status">{done}</p>}
  {error && <p className="snack-log-error" role="alert">{error}</p>}
  <small className="snack-log-foot">식품의약품안전처 식품영양성분 DB 기준 참고값이에요. 실제 양·레시피에 따라 달라요.</small>
 </section>;
}
