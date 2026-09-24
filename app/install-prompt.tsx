'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from './app-shell';
import './install-prompt.css';

type InstallEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
const dismissalKey = 'kkini-install-dismissed-until';
const installedKey = 'kkini-install-completed';

export function InstallPrompt({ active }: { active: boolean }) {
  const installEvent = useRef<InstallEvent | null>(null);
  const [mode, setMode] = useState<'native' | 'ios' | null>(null);
  const [hidden, setHidden] = useState(true);
  const [instructions, setInstructions] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)');
    const isStandalone = () => standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isEmbedded = /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\/|; wv\)/i.test(navigator.userAgent);
    const suppressed = () => {
      if (isStandalone()) return true;
      try {
        return Number(localStorage.getItem(dismissalKey)) > Date.now() || sessionStorage.getItem(installedKey) === '1';
      } catch { return false; }
    };
    const initialize = window.setTimeout(() => {
      if (isIos && !isEmbedded) setMode('ios');
      setHidden(suppressed());
    }, 0);
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      installEvent.current = event as InstallEvent;
      setMode('native');
      setHidden(suppressed());
    };
    const installed = () => {
      installEvent.current = null;
      setHidden(true);
      try { sessionStorage.setItem(installedKey, '1'); } catch { /* Storage can be disabled. */ }
    };
    const displayChanged = () => { if (isStandalone()) installed(); };
    const storageChanged = (event: StorageEvent) => {
      if (event.key === dismissalKey) setHidden(suppressed());
    };
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', installed);
    window.addEventListener('storage', storageChanged);
    standalone.addEventListener('change', displayChanged);
    return () => {
      window.clearTimeout(initialize);
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', installed);
      window.removeEventListener('storage', storageChanged);
      standalone.removeEventListener('change', displayChanged);
    };
  }, []);

  function dismiss() {
    setHidden(true);
    try { localStorage.setItem(dismissalKey, String(Date.now() + 7 * 24 * 60 * 60 * 1000)); } catch { /* Dismiss for this visit even without storage. */ }
  }

  async function install() {
    const event = installEvent.current;
    if (!event || installing) return;
    setInstalling(true);
    setError('');
    try {
      await event.prompt();
      const choice = await event.userChoice;
      installEvent.current = null;
      if (choice.outcome === 'dismissed') dismiss();
      else setHidden(true);
    } catch {
      installEvent.current = null;
      setError('설치 창을 열지 못했어요. 브라우저 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택해 주세요.');
    } finally { setInstalling(false); }
  }

  if (!active || hidden || !mode) return null;
  return <aside className="install-prompt" aria-label="끼니플랜 앱 설치 안내">
    <div className="install-prompt-copy"><span className="install-prompt-icon" aria-hidden="true"><Icon name="home" size={23}/></span><div><strong>끼니플랜, 앱으로 더 간편하게</strong><p>{mode === 'ios' ? '아이폰은 홈 화면에 추가해야 밥 먹을 시간에 식사 알림을 받을 수 있어요.' : '홈 화면에서 바로 열고, 밥 먹을 시간에 오늘 메뉴 알림을 받아요.'}</p></div></div>
    <button className="install-prompt-close" type="button" onClick={dismiss} aria-label="설치 안내 7일 동안 닫기"><Icon name="close" size={18}/></button>
    <div className="install-prompt-actions">{mode === 'native' ? <button className="install-prompt-primary" type="button" onClick={install} disabled={installing || Boolean(error)}>{installing ? '설치 확인 중…' : '앱 설치하기'}</button> : <button className="install-prompt-primary" type="button" onClick={() => setInstructions(!instructions)} aria-expanded={instructions} aria-controls="install-ios-help">홈 화면에 추가하기</button>}<button className="install-prompt-later" type="button" onClick={dismiss}>나중에</button></div>
    {instructions && mode === 'ios' && <div id="install-ios-help" className="install-prompt-help"><p>Safari에서 아래 순서로 추가해 주세요.</p><ol><li>브라우저의 <strong>공유</strong> 버튼 누르기</li><li><strong>홈 화면에 추가</strong> 선택하기</li><li>‘웹 앱으로 열기’가 보이면 켜고 <strong>추가</strong> 누르기</li><li>홈 화면의 끼니플랜을 열고 <strong>마이 → 식사 알림</strong> 켜기</li></ol></div>}
    {error && <p className="install-prompt-help" role="status">{error}</p>}
  </aside>;
}
