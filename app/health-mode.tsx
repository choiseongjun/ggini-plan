'use client';


import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { healthModes, isHealthGoal } from '../lib/health-goal';
import type { BodyGoal } from '../lib/nutrition-plan';
import { ProfileIcon } from './profile-icons';
import './health-mode.css';

const guestKey = 'ggini-health-goal';
export function HealthMode({ userId, compact=false }: { userId?: string; compact?: boolean }) {
  const [goal, setGoal] = useState<BodyGoal | null>(null);
  const [choice, setChoice] = useState<BodyGoal | null>(null);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        let value: unknown = null;
        if (userId) {
          const response = await fetch('/api/health-goal', { cache: 'no-store', signal: controller.signal });
          if (!response.ok) throw new Error('모드를 불러오지 못했어요. 다시 열어 확인해 주세요.');
          value = (await response.json()).goal;
        } else { try { value = localStorage.getItem(guestKey); } catch {} }
        if (controller.signal.aborted) return;
        const next = isHealthGoal(value) ? value : null;
        setGoal(next); setChoice(next); setOpen(!next); setReady(true);
      } catch (e) { if (!controller.signal.aborted) { setError(e instanceof Error ? e.message : '불러오지 못했어요.'); setReady(true); } }
    }
    void load();
    const changed = (event: Event) => { const value = (event as CustomEvent).detail; if (isHealthGoal(value)) { setGoal(value); setChoice(value); } };
    window.addEventListener('health-goal-changed', changed);
    return () => { controller.abort(); window.removeEventListener('health-goal-changed', changed); };
  }, [userId]);
  useEffect(() => {
    if (!open || !dialog.current) return;
    const node = dialog.current, focused = document.activeElement;
    const overflow = document.body.style.overflow;
    node.showModal(); document.body.style.overflow = 'hidden';
    return () => { node.close(); document.body.style.overflow = overflow; if (focused instanceof HTMLElement) focused.focus(); };
  }, [open]);
  async function save() {
    if (!choice || saving) return;
    setSaving(true); setError('');
    try {
      if (userId) {
        const response = await fetch('/api/health-goal', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal: choice }) });
        if (!response.ok) throw new Error('저장하지 못했어요. 다시 눌러 주세요.');
      } else { localStorage.setItem(guestKey, choice); }
      setGoal(choice); setOpen(false);
      window.dispatchEvent(new CustomEvent('health-goal-changed', { detail: choice }));
    } catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했어요.'); }
    finally { setSaving(false); }
  }
  if (!ready) return null;
  return <section className={`health-mode${compact?' health-mode-compact':''}`} aria-label="나의 관리 모드">
    <div className="health-mode-current"><div><small>나의 관리 모드</small><strong>{goal ? healthModes[goal].label : '어떤 목표로 시작할까요?'}</strong></div><button type="button" onClick={() => { setChoice(goal); setError(''); setOpen(true); }}>{goal ? '변경' : '선택하기'}</button></div>
    {goal && !compact && <><p>{healthModes[goal].focus}</p><Link href="/profile#profile-settings">내 몸에 맞는 영양 목표 확인하기 →</Link></>}
    {!open && error && <p role="alert">{error}</p>}
    <dialog ref={dialog} className="health-mode-dialog" aria-labelledby="health-mode-title" onCancel={e => { e.preventDefault(); if (!saving) setOpen(false); }}>
      <div className="health-mode-sheet"><small>나에게 맞게 시작해요</small><h2 id="health-mode-title">지금 가장 원하는<br/>변화는 무엇인가요?</h2><p>먼저 모드를 골라주세요.<br/>언제든 바꿀 수 있어요.</p>
        <div className="health-mode-options" role="group" aria-label="관리 모드 선택">{(Object.keys(healthModes) as BodyGoal[]).map(key => <button type="button" key={key} aria-pressed={choice === key} disabled={saving} onClick={() => setChoice(key)}><ProfileIcon name={key === 'lose' ? 'leaf' : key === 'muscle' ? 'bolt' : 'balance'}/><span><strong>{healthModes[key].label}</strong><small>{healthModes[key].description}</small></span><span aria-hidden="true">{choice === key ? '✓' : '○'}</span></button>)}</div>
        <p className="health-mode-note">모드만 바꿔도 기존 기록과 직접 정한 칼로리·탄단지 목표는 그대로 유지돼요. 영양 목표는 내 정보에서 확인하고 저장해 주세요.{!userId && ' 로그인 전에는 이 기기에 저장해요.'}</p>
        {error && <p role="alert">{error}</p>}
        <button type="button" className="health-mode-save" disabled={!choice || saving} onClick={() => void save()}>{saving ? '저장 중…' : choice ? `${healthModes[choice].label} 모드로 시작` : '모드를 선택해 주세요'}</button>
        <button type="button" className="health-mode-later" disabled={saving} onClick={() => setOpen(false)}>나중에 설정할게요</button>
      </div>
    </dialog>
  </section>;
}
