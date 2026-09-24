'use client';

import {useEffect, useRef, useState} from 'react';
import type {EatOutOption, EatOutState} from '../lib/eat-out';
import {trackPlanner} from '../lib/track-planner';
import {INTAKE_LOGGED_EVENT} from './record-progress';
import './eat-out-card.css';

const KINDS: [string, string][] = [['', '아무거나'], ['korean', '한식'], ['snack', '분식'], ['chinese', '중식'], ['japanese', '일식'], ['western', '양식'], ['light', '가볍게']];
const VERDICT = {good: '잘 맞아요', ok: '괜찮아요', avoid: '오늘은 비추'} as const;
const n = (v: number) => Math.round(v).toLocaleString('ko-KR');
// 받침 있으면 '이', 없으면 '가'.
const iga = (word: string) => { const c = word.charCodeAt(word.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? '이' : '가'; };
type Result = {state: EatOutState; options: EatOutOption[]; missing?: string[]};
// 비교 1등이 2등보다 나은 점(숫자로).
function whyBetter(a: EatOutOption, b: EatOutOption, budget: number) {
 const out: string[] = [];
 if (a.sodium !== null && b.sodium !== null && b.sodium - a.sodium >= 300) out.push(`나트륨이 ${n(b.sodium - a.sodium)}mg 적어요`);
 if (a.kcal !== null && b.kcal !== null && Math.abs(a.kcal - budget) + 80 < Math.abs(b.kcal - budget)) out.push(`이번 끼니 몫(${n(budget)}kcal)에 더 가까워요`);
 if (a.protein !== null && b.protein !== null && a.protein - b.protein >= 8) out.push(`단백질이 ${n(a.protein - b.protein)}g 많아요`);
 if (a.carbs !== null && b.carbs !== null && b.carbs - a.carbs >= 15) out.push(`탄수화물이 ${n(b.carbs - a.carbs)}g 적어요`);
 return out.slice(0, 2).join(', ');
}

// "지금 뭐 먹지?": 밖에서 먹는 한 끼를 오늘 먹은 양 기준으로 골라 주거나(추천) 고민 중인 메뉴를 비교한다.
export function EatOutCard({userId, onLogin}: {userId?: string; onLogin: () => void}) {
 const [open, setOpen] = useState(false);
 const [tab, setTab] = useState<'suggest' | 'compare'>('suggest');
 const [kind, setKind] = useState('');
 const [names, setNames] = useState('');
 const [result, setResult] = useState<Result | null>(null);
 const [busy, setBusy] = useState(false), [error, setError] = useState(''), [logged, setLogged] = useState<string | null>(null);
 const dialog = useRef<HTMLDialogElement>(null);
 useEffect(() => { const node = dialog.current; if (!open || !node) return; node.showModal(); return () => node.close(); }, [open]);

 async function run(body: Record<string, unknown>) {
  setBusy(true); setError(''); setLogged(null);
  try {
   const r = await fetch('/api/eat-out', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
   const d = await r.json(); if (!r.ok) throw new Error(d.error);
   setResult(d); trackPlanner('eat_out_used');
  } catch (e) { setError(e instanceof Error ? e.message : '메뉴를 고르지 못했어요.'); } finally { setBusy(false); }
 }
 const suggest = (k = kind) => void run({mode: 'suggest', kind: k || null});
 const compare = () => void run({mode: 'compare', names: names.split(/[,，\s]+|vs|VS/).filter(Boolean)});

 async function eat(o: EatOutOption) {
  if (!userId) { setOpen(false); onLogin(); return; }
  setBusy(true); setError('');
  try {
   const post = (body: Record<string, unknown>) => fetch('/api/food-intake', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'log', id: crypto.randomUUID(), version: 0, ...body})}).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); });
   await post({referenceCode: o.code, portions: 1});
   if (o.withRice) await post({extras: ['rice-full']});
   setLogged(o.code); trackPlanner('snack_logged');
   window.dispatchEvent(new CustomEvent(INTAKE_LOGGED_EVENT));
  } catch (e) { setError(e instanceof Error ? e.message : '기록하지 못했어요.'); } finally { setBusy(false); }
 }

 const s = result?.state;
 return <section className="eo-entry" aria-label="지금 뭐 먹지">
  <div><strong>밖에서 먹어요?</strong><span>오늘 먹은 걸 보고 지금 먹기 좋은 메뉴를 골라 드려요</span></div>
  <button type="button" onClick={() => { setOpen(true); if (!result) suggest(''); }}>지금 뭐 먹지?</button>

  {open && <dialog ref={dialog} className="eo-dialog" aria-labelledby="eo-title" onCancel={(e) => { e.preventDefault(); setOpen(false); }} onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
   <div className="eo-sheet">
    <header className="eo-head">
     <div><span className="eo-kicker">{s ? `${s.slot} · 이번 끼니 약 ${n(s.budget.kcal)}kcal` : '지금 뭐 먹지?'}</span><h2 id="eo-title">지금 뭐 먹지?</h2></div>
     <button type="button" className="eo-close" aria-label="닫기" onClick={() => setOpen(false)}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    </header>
    <div className="eo-tabs" role="tablist">
     <button type="button" role="tab" aria-selected={tab === 'suggest'} onClick={() => { setTab('suggest'); setResult(null); suggest(); }}>추천받기</button>
     <button type="button" role="tab" aria-selected={tab === 'compare'} onClick={() => { setTab('compare'); setResult(null); setError(''); }}>고민 중인 메뉴 비교</button>
    </div>
    <div className="eo-scroll">
     {tab === 'suggest' ? <div className="eo-kinds" role="group" aria-label="음식 종류">{KINDS.map(([k, label]) => <button type="button" key={k} aria-pressed={kind === k} disabled={busy} onClick={() => { setKind(k); suggest(k); }}>{label}</button>)}</div>
      : <form className="eo-compare" onSubmit={(e) => { e.preventDefault(); compare(); }}>
       <input value={names} onChange={(e) => setNames(e.target.value)} placeholder="예: 짜장면, 짬뽕" aria-label="비교할 메뉴(쉼표로 구분)"/>
       <button type="submit" disabled={busy}>비교하기</button>
      </form>}
     {s && <p className="eo-state">{s.personal ? '내 목표' : '일반 성인 기준'} · 오늘 먹은 양 {n(s.eaten.kcal)}kcal{s.eaten.sodium > 0 ? `, 나트륨 ${n(s.eaten.sodium)}mg` : ''}{s.health.length ? ` · ${s.health.join('·')}` : ''}{!s.personal && !userId ? ' · 로그인하면 내 기록에 맞춰 골라요' : ''}</p>}
     {busy && !result && <p className="eo-note">고르는 중…</p>}
     {error && <p className="eo-error" role="alert">{error}</p>}
     {result && tab === 'compare' && result.options.length >= 2 && <p className="eo-winner"><b>{result.options[0].name}</b>{iga(result.options[0].name)}{` ${result.options[1].name}보다`} 지금 먹기 더 좋아요.{whyBetter(result.options[0], result.options[1], result.state.budget.kcal) && ` ${whyBetter(result.options[0], result.options[1], result.state.budget.kcal)}.`}</p>}
     {result?.missing && result.missing.length > 0 && <p className="eo-note">찾지 못한 메뉴: {result.missing.join(', ')}</p>}
     {result && <ul className="eo-list">{result.options.map((o) => <li key={o.code} className={`is-${o.verdict}`}>
      <div className="eo-item-top"><strong>{o.name}{o.withRice ? ' + 공깃밥' : ''}</strong><em>{VERDICT[o.verdict]}</em></div>
      <p className="eo-meta">{o.kcal !== null && `${n(o.kcal)}kcal`}{o.protein !== null && ` · 단백질 ${n(o.protein)}g`}{o.sodium !== null && ` · 나트륨 ${n(o.sodium)}mg`}{o.carbs !== null && ` · 탄수 ${n(o.carbs)}g`}</p>
      {o.reasons.length > 0 && <ul className="eo-reasons">{o.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
      <button type="button" className="eo-eat" disabled={busy || logged === o.code} onClick={() => void eat(o)}>{logged === o.code ? '기록했어요' : userId ? '이거 먹었어요' : '로그인하고 기록하기'}</button>
     </li>)}</ul>}
     {result && tab === 'suggest' && <button type="button" className="eo-again" disabled={busy} onClick={() => suggest()}>다른 메뉴 보기</button>}
     <small className="eo-foot">식품의약품안전처 식품영양성분 DB의 1인분 참고값이에요. 식당·양에 따라 달라요.</small>
    </div>
   </div>
  </dialog>}
 </section>;
}
