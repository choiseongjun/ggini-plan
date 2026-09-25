'use client';

import {useEffect, useRef, useState} from 'react';
import type {FoodReference} from '../lib/food-reference';
import {trackPlanner} from '../lib/track-planner';
import {INTAKE_LOGGED_EVENT} from './record-progress';
import './snack-log.css';
import {MealPhotoLog} from './meal-photo-log';
import {validPortions} from '../lib/food-intake';
import {hasCachedFoodSearch,searchFoods} from '../lib/food-search-client';
import {manualFoodReference} from '../lib/basic-food-reference';

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
 const recentVersion=useRef(0);
 const [recentLoading,setRecentLoading]=useState(true);
 const [searchError,setSearchError]=useState('');

 useEffect(() => {
  let alive=true;
  const version=recentVersion.current;
  fetch('/api/food-reference?recent=1',{cache:'no-store'})
   .then(async response=>{if(!response.ok)throw Error();return response.json();})
   .then(data=>{if(alive&&version===recentVersion.current)setRecent(data.items??[]);})
   .catch(()=>{})
   .finally(()=>{if(alive)setRecentLoading(false);});
  return()=>{alive=false;};
 },[]);
 useEffect(()=>{if(open)input.current?.focus();},[open]);
 const q = query.trim();
 useEffect(() => {
  if (!q) return;
  let active=true;
  const timer=window.setTimeout(()=>{
   searchFoods(q).then(data=>{if(active){setResults({q,items:data.items});setSearchError('');}})
    .catch(()=>{if(active){setResults({q,items:[]});setSearchError('검색을 불러오지 못했어요. 이름 그대로 기록할 수도 있어요.');}});
  },hasCachedFoodSearch(q)?0:150);
  return()=>{window.clearTimeout(timer);active=false;};
 },[q]);
 function remember(food:FoodReference){
  recentVersion.current++;
  setRecent(items=>[food,...items.filter(item=>item.code!==food.code)].slice(0,8));
 }

 async function log(amount=portions) {
  if (!picked || !validPortions(amount)) return;
  setBusy(true); setError('');
  try {
   const r = await fetch('/api/food-intake', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'log', id: crypto.randomUUID(), version: 0, referenceCode: picked.code, portions:amount})});
   const d = await r.json();
   if (!r.ok) throw new Error(d.error);
   setDone(`${picked.name} 기록했어요${picked.kcal !== null ? ` · 약 ${n(picked.kcal * amount)}kcal` : ''}`);
   remember(picked);
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
  {photo&&<p className="snack-log-note">음식을 고른 뒤 사진을 올리면 먹은 양을 추정해요. 올린 사진은 식사 기록에 함께 보관돼요.</p>}
  <input ref={input} type="search" value={query} placeholder="예: 카페라떼, 치즈케이크, 스타벅스, 순대국밥" aria-label="음식 이름 검색" maxLength={40} disabled={busy} onChange={(e) => { setQuery(e.target.value); setPicked(null);setSearchError('');setDone(''); }}/>
  {!q&&recentLoading&&!recent.length&&<p className="snack-log-note" role="status">최근 기록을 불러오는 중이에요. 음식 이름을 바로 검색할 수 있어요.</p>}
  {!q && recent.length > 0 && <span className="snack-log-label">최근에 기록한 것</span>}
  {q && list === null && <p className="snack-log-note">찾고 있어요…</p>}
  {q&&searchError&&<p role="alert" className="snack-log-note">{searchError}</p>}
  {q&&!picked&&<div className="snack-log-manual"><button type="button" disabled={busy} onClick={()=>{const food=manualFoodReference(`manual:${q}`);if(food){setPicked(food);setPortions(1);}}}>목록에 없나요? ‘{q}’ 그대로 기록하기</button><small>이름과 먹은 양을 저장해요. 영양정보는 미확인으로 표시해요.</small></div>}
  {!picked && list && list.length > 0 && <ul className="snack-log-list">{list.map((f) => <li key={f.code}>
   <button type="button" onClick={() => { setPicked(f); setPortions(1); }}>
    <span><strong>{f.name}</strong>{f.brand && <small>{f.brand}</small>}</span>
    <span className="snack-log-meta">{serving(f)}{f.kcal !== null && ` · ${n(f.kcal)}kcal`}{f.sugar !== null && f.sugar >= 1 && ` · 당류 ${n(f.sugar)}g`}</span>
   </button>
  </li>)}</ul>}
  {picked && <div className="snack-log-pick">
   <p><strong>{picked.name}</strong>{picked.brand && <small> {picked.brand}</small>}<span>1회 {serving(picked)} 기준</span></p>
   {photo&&<MealPhotoLog key={picked.code} referenceCode={picked.code} dishName={picked.name} disabled={busy} onManual={()=>void log()} onFallback={()=>void log(1)} onLogged={()=>{remember(picked);setPicked(null);setQuery('');setDone('사진으로 식사를 기록했어요. 아래에서 양을 수정할 수 있어요.');window.dispatchEvent(new CustomEvent(INTAKE_LOGGED_EVENT));onLogged();}}/>}
   <div className="snack-log-portions" role="radiogroup" aria-label="먹은 양">{portionsList.map(([value, label]) => <button type="button" role="radio" key={value} aria-checked={portions === value} onClick={() => setPortions(value)}>{label}</button>)}</div>
   <label className="snack-log-custom">먹은 양 직접 입력<input type="number" min="0.25" max="10" step="0.25" aria-label="먹은 양 직접 입력" value={portions||''} disabled={busy} onChange={e=>setPortions(Number(e.target.value))}/>회</label>
   <p className="snack-log-total" aria-live="polite">{!validPortions(portions)?'먹은 양을 0.25~10회, 0.25 단위로 입력해 주세요.':<>{picked.kcal !== null ? <>약 <b>{n(picked.kcal * portions)}</b>kcal</> : '칼로리 정보 없음'}{picked.sugar !== null && ` · 당류 ${n(picked.sugar * portions)}g`}{picked.sodium !== null && ` · 나트륨 ${n(picked.sodium * portions)}mg`}</>}</p>
   <div className="snack-log-actions"><button type="button" onClick={() => setPicked(null)}>다시 고르기</button><button type="button" className="snack-log-submit" disabled={busy||!validPortions(portions)} onClick={() => void log()}>{busy ? '기록 중…' : '기록하기'}</button></div>
  </div>}
  {done&&<p className="snack-log-done" role="status">{done}</p>}
  {error && <p className="snack-log-error" role="alert">{error}</p>}
  <small className="snack-log-foot">검색 음식은 식품의약품안전처 DB 참고값이에요. 직접 입력한 음식은 영양정보가 미확인으로 남고 합계에서 제외돼요.</small>
 </section>;
}
