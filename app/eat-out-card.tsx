'use client';

import Image from 'next/image';
import Link from 'next/link';
import {NearbyRestaurants} from './nearby-restaurants';
import {rememberRecordMode} from '../lib/record-intent';
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

// 음식 사진(없거나 깨지면 접시 아이콘).
function DishPhoto({src}: {src?: string | null}) {
 const [failed, setFailed] = useState(false);
 return <span className="eo-photo" aria-hidden="true">{src && !failed ? <Image src={src} alt="" width={64} height={64} unoptimized onError={() => setFailed(true)}/> : '🍽️'}</span>;
}

// 비교 탭: 자주 고민하는 메뉴를 눌러 담는다(이름은 음식 영양 사전에서 제대로 찾아지는 것만).
const MATCHUPS: [string, string][] = [['짜장면', '짬뽕'], ['김치찌개', '된장찌개'], ['돈가스', '제육덮밥'], ['떡볶이', '김밥'], ['물냉면', '비빔냉면'], ['후라이드치킨', '양념치킨']];
const PICKS: [string, string[]][] = [
 ['한식', ['김치찌개', '된장찌개', '순두부찌개', '부대찌개', '제육덮밥', '비빔밥', '순대국밥', '소불고기', '갈비탕', '육개장', '물냉면', '비빔냉면']],
 ['분식', ['떡볶이', '김밥', '라볶이', '쫄면', '칼국수', '잔치국수', '군만두', '순대']],
 ['중식', ['짜장면', '짬뽕', '볶음밥', '새우볶음밥', '탕수육', '마파두부']],
 ['일식·아시안', ['돈가스', '우동', '초밥', '회덮밥', '카레라이스', '오므라이스', '소고기덮밥', '쌀국수']],
 ['양식', ['토마토스파게티', '까르보나라', '치즈피자', '햄버거', '스테이크', '후라이드치킨', '양념치킨']],
];
const MAX_PICKS = 4;

function ComparePicker({busy, onCompare}: {busy: boolean; onCompare: (names: string[]) => void}) {
 const [picked, setPicked] = useState<string[]>([]);
 const [group, setGroup] = useState(0);
 const [query, setQuery] = useState(''), [hits, setHits] = useState<string[]>([]);
 const toggle = (name: string) => setPicked((p) => p.includes(name) ? p.filter((x) => x !== name) : p.length >= MAX_PICKS ? p : [...p, name]);
 // 목록에 없는 메뉴: 음식 영양 사전에서 이름 검색(브랜드 제품은 빼고).
 useEffect(() => {
  const q = query.trim(); if (!q) return;
  const ctrl = new AbortController();
  const t = setTimeout(() => void fetch(`/api/food-reference?q=${encodeURIComponent(q)}`, {signal: ctrl.signal}).then((r) => r.json())
   .then((d: {items?: {name: string; brand: string | null}[]}) => setHits([...new Set((d.items ?? []).filter((i) => !i.brand).map((i) => i.name))].slice(0, 6))).catch(() => {}), 250);
  return () => { clearTimeout(t); ctrl.abort(); };
 }, [query]);
 const add = (name: string) => { toggle(name); setQuery(''); setHits([]); };
 return <div className="eo-picker">
  <div className="eo-matchups" role="group" aria-label="자주 고민하는 조합">{MATCHUPS.map(([a, b]) => <button type="button" key={a + b} disabled={busy} onClick={() => { setPicked([a, b]); onCompare([a, b]); }}>{a} <i>vs</i> {b}</button>)}</div>
  <div className="eo-groups" role="tablist">{PICKS.map(([label], i) => <button type="button" role="tab" key={label} aria-selected={group === i} onClick={() => setGroup(i)}>{label}</button>)}</div>
  <div className="eo-kinds" role="group" aria-label="비교할 메뉴 고르기">{PICKS[group][1].map((name) => <button type="button" key={name} aria-pressed={picked.includes(name)} disabled={!picked.includes(name) && picked.length >= MAX_PICKS} onClick={() => toggle(name)}>{name}</button>)}</div>
  <div className="eo-search">
   <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && query.trim()) { e.preventDefault(); add(query.trim().slice(0, 30)); } }} placeholder="다른 메뉴 찾기" aria-label="다른 메뉴 찾기" disabled={picked.length >= MAX_PICKS}/>
   {query.trim() && hits.length > 0 && <ul>{hits.map((h) => <li key={h}><button type="button" onClick={() => add(h)}>{h}</button></li>)}</ul>}
  </div>
  <div className="eo-picked">
   {picked.length ? picked.map((name) => <button type="button" key={name} onClick={() => toggle(name)} aria-label={`${name} 빼기`}>{name} ✕</button>) : <span>메뉴를 2~{MAX_PICKS}개 골라 주세요</span>}
   <button type="button" className="eo-go" disabled={busy || picked.length < 2} onClick={() => onCompare(picked)}>{picked.length >= 2 ? `${picked.length}개 비교하기` : '비교하기'}</button>
  </div>
 </div>;
}

// "지금 뭐 먹지?": 밖에서 먹는 한 끼를 오늘 먹은 양 기준으로 골라 주거나(추천) 고민 중인 메뉴를 비교한다.
export function EatOutCard({userId, onLogin}: {userId?: string; onLogin: () => void}) {
 const [open, setOpen] = useState(false);
 const [tab, setTab] = useState<'suggest' | 'compare'>('suggest');
 const [kind, setKind] = useState('');
 const [result, setResult] = useState<Result | null>(null);
 const [busy, setBusy] = useState(false), [error, setError] = useState(''), [logged, setLogged] = useState<string | null>(null);
 const dialog = useRef<HTMLDialogElement>(null);
 const winner = useRef<HTMLParagraphElement>(null);
 // 비교 결과는 고르는 칸 아래에 나오니 결과로 내려 준다.
 useEffect(() => { if (tab === 'compare' && result) winner.current?.scrollIntoView({behavior: 'smooth', block: 'start'}); }, [tab, result]);
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
 const compare = (names: string[]) => void run({mode: 'compare', names});

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
  <div><strong>오늘은 밖에서 먹나요?</strong><span>지금 먹기 좋은 메뉴를 골라드려요.</span></div>
  <button type="button" onClick={() => { setOpen(true); if (!result) suggest(''); }}>메뉴 찾기</button>

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
      : <ComparePicker busy={busy} onCompare={compare}/>}
     {s && <p className="eo-state">{s.personal ? '내 목표' : '일반 성인 기준'} · 오늘 먹은 양 {n(s.eaten.kcal)}kcal{s.eaten.sodium > 0 ? `, 나트륨 ${n(s.eaten.sodium)}mg` : ''}{s.health.length ? ` · ${s.health.join('·')}` : ''}{!s.personal && !userId ? ' · 로그인하면 내 기록에 맞춰 골라요' : ''}</p>}
     {busy && !result && <p className="eo-note">고르는 중…</p>}
     {error && <p className="eo-error" role="alert">{error}</p>}
     {result && tab === 'compare' && result.options.length >= 2 && <p ref={winner} className="eo-winner"><b>{result.options[0].name}</b>{iga(result.options[0].name)}{` ${result.options[1].name}보다`} 지금 먹기 더 좋아요.{whyBetter(result.options[0], result.options[1], result.state.budget.kcal) && ` ${whyBetter(result.options[0], result.options[1], result.state.budget.kcal)}.`}</p>}
     {result?.missing && result.missing.length > 0 && <p className="eo-note">찾지 못한 메뉴: {result.missing.join(', ')}</p>}
     {result && <ul className="eo-list">{result.options.map((o) => <li key={o.code} className={`is-${o.verdict}`}>
      <div className="eo-item-head">
       <DishPhoto src={o.image}/>
       <div>
        <div className="eo-item-top"><strong>{o.name}{o.withRice ? ' + 공깃밥' : ''}</strong><em>{VERDICT[o.verdict]}</em></div>
        <p className="eo-meta">{o.kcal !== null && `${n(o.kcal)}kcal`}{o.protein !== null && ` · 단백질 ${n(o.protein)}g`}{o.sodium !== null && ` · 나트륨 ${n(o.sodium)}mg`}{o.carbs !== null && ` · 탄수 ${n(o.carbs)}g`}</p>
       </div>
      </div>
      {o.reasons.length > 0 && <ul className="eo-reasons">{o.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
      <NearbyRestaurants menu={o.name}/>
      <button type="button" className="eo-eat" disabled={busy || logged === o.code} onClick={() => void eat(o)}>{logged === o.code ? '기록했어요' : userId ? '이거 먹었어요' : '로그인하고 기록하기'}</button>
     </li>)}</ul>}
     {result && tab === 'suggest' && <button type="button" className="eo-again" disabled={busy} onClick={() => suggest()}>다른 메뉴 보기</button>}
     {result&&<Link href="/record" className="eo-photo-record" onClick={()=>{rememberRecordMode('photo');setOpen(false);}}>먹고 난 뒤, 사진으로 기록하기</Link>}
     <small className="eo-foot">식품의약품안전처 식품영양성분 DB의 1인분 참고값이에요. 식당·양에 따라 달라요.</small>
    </div>
   </div>
  </dialog>}
 </section>;
}
