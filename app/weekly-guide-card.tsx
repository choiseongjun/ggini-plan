'use client';

import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import type {WeeklyGuide} from '../lib/weekly-guide';
import {INTAKE_LOGGED_EVENT} from './record-progress';
import './weekly-guide-card.css';

type GuideResponse = WeeklyGuide & {refreshing?: boolean};

const n = (v: number) => Math.round(v).toLocaleString('ko-KR');

// 홈: "이번 주 이렇게 드세요" 카드 + 자세히(영양 목표·집중할 것·더 먹을 것/줄일 것·한 끼 구성).
export function WeeklyGuideCard({userId}: {userId: string}) {
 const [guide, setGuide] = useState<GuideResponse | null>(null);
 const [open, setOpen] = useState(false);
 const [revision, setRevision] = useState(0);
 const dialog = useRef<HTMLDialogElement>(null);
 useEffect(() => {
  const c = new AbortController();
  let timer = 0, tries = 0;
  const load = () => fetch('/api/weekly-guide', {cache: 'no-store', signal: c.signal}).then((r) => r.ok ? r.json() : null).then((d) => {
   if (!d || c.signal.aborted) return;
   setGuide(d);
   // AI 맞춤 가이드를 만드는 중이면 잠시 뒤 다시 받아 온다(최대 3번).
   if (d.refreshing && tries++ < 3) timer = window.setTimeout(load, 9000);
  }).catch(() => {});
  void load();
  return () => { c.abort(); window.clearTimeout(timer); };
 }, [userId, revision]);
 // 먹은 기록이 바뀌면 가이드도 다시 계산한다.
 useEffect(() => {
  const refresh = () => setRevision((v) => v + 1);
  window.addEventListener(INTAKE_LOGGED_EVENT, refresh);
  return () => window.removeEventListener(INTAKE_LOGGED_EVENT, refresh);
 }, []);
 useEffect(() => {
  const node = dialog.current;
  if (!open || !node) return;
  node.showModal();
  return () => node.close();
 }, [open]);

 if (!guide) return null;
 if (!guide.hasProfile) return <section className="wg-card is-empty" aria-label="이번 주 식단 가이드">
  <span className="wg-kicker">이번 주 식단 가이드</span>
  <p>{guide.headline}</p>
  <Link href="/profile#profile-settings" className="wg-link">내 정보 입력하기 →</Link>
 </section>;

 const t = guide.targets!, r = guide.recent;
 const rows: [string, string, number | null, number][] = [
  ['열량', `${n(t.kcal)}kcal`, r?.kcal ?? null, t.kcal],
  ['단백질', `${t.protein}g 이상`, r?.protein ?? null, t.protein],
  ['탄수화물', `${t.carbs[0]}~${t.carbs[1]}g`, r?.carbs ?? null, t.carbs[1]],
  ['나트륨', `${n(t.sodium)}mg 이하`, r?.sodium ?? null, t.sodium],
  ['당류', `${t.sugar}g 이하`, r?.sugar ?? null, t.sugar],
 ];
 return <section className="wg-card" aria-label="이번 주 식단 가이드">
  <span className="wg-kicker">{guide.ai ? '나만의 이번 주 가이드' : '이번 주 이렇게 드세요'}{guide.health.length ? ` · ${guide.health.join('·')}` : ` · ${guide.goal}`}</span>
  <p className="wg-headline">{guide.headline}</p>
  <ol className="wg-points">{guide.points.map((p) => <li key={p}>{p}</li>)}</ol>
  <button type="button" className="wg-more" onClick={() => setOpen(true)}>자세히 보기</button>

  {open && <dialog ref={dialog} className="wg-dialog" aria-labelledby="wg-title" onCancel={(e) => { e.preventDefault(); setOpen(false); }} onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
   <div className="wg-sheet">
    <header><h2 id="wg-title">이번 주 식단 가이드</h2><button type="button" aria-label="닫기" onClick={() => setOpen(false)}>
     <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
    <p className="wg-headline">{guide.headline}</p>

    <h3>하루 영양 목표</h3>
    <table className="wg-table"><thead><tr><th>항목</th><th>목표</th><th>{r ? `최근 ${r.days}일 평균` : '최근 평균'}</th></tr></thead>
     <tbody>{rows.map(([label, goal, value, ref]) => <tr key={label}><th>{label}</th><td>{goal}</td>
      <td>{value === null ? <span className="wg-muted">기록 부족</span> : <span className={value > ref * 1.15 && label !== '단백질' ? 'is-over' : label === '단백질' && value < ref * .8 ? 'is-under' : ''}>{n(value)}{label === '열량' ? 'kcal' : label === '나트륨' ? 'mg' : 'g'}</span>}</td></tr>)}</tbody></table>
    <p className="wg-note">한 끼 약 {n(t.perMealKcal)}kcal 기준 · {r ? '기록한 날만 평균했어요.' : '먹은 걸 2일 이상 기록하면 내 평균과 비교해 드려요.'}</p>

    <h3>이번 주 집중할 것</h3>
    <ol className="wg-focus">{guide.focus.map((f) => <li key={f.title}><strong>{f.title}</strong><p>{f.detail}</p></li>)}</ol>

    {(guide.eatMore.length > 0 || guide.eatLess.length > 0) && <div className="wg-lists">
     {guide.eatMore.length > 0 && <div><h3>더 챙길 것</h3><ul>{guide.eatMore.map((x) => <li key={x}>{x}</li>)}</ul></div>}
     {guide.eatLess.length > 0 && <div><h3>줄일 것</h3><ul>{guide.eatLess.map((x) => <li key={x}>{x}</li>)}</ul></div>}
    </div>}

    <h3>한 끼는 이렇게</h3>
    <ul className="wg-plate">{guide.plate.map((x) => <li key={x}>{x}</li>)}</ul>

    {guide.weight && <p className="wg-note">체중: 최근 {guide.weight.weeks}주 동안 {guide.weight.change > 0 ? '+' : ''}{guide.weight.change}kg</p>}
    <small className="wg-foot">목표 수치는 2025 한국인 영양소 섭취기준과 내 정보로 계산했고, {guide.ai ? '조언은 AI가 내 정보·기록을 보고 썼어요' : '조언은 내 정보·기록 기준의 일반적인 안내예요'}. 질환 치료나 진단을 대신하지 않아요.</small>
   </div>
  </dialog>}
 </section>;
}
