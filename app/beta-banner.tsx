'use client';

import {useEffect, useState} from 'react';

const KEY = 'kkiniplan-beta-banner-closed-v1';

// 베타 안내: 화면 위에 고정, 닫으면 이 기기에서는 다시 보이지 않는다.
export function BetaBanner() {
 const [open, setOpen] = useState(false);
 useEffect(() => {
  let closed = false;
  try { closed = localStorage.getItem(KEY) === '1'; } catch { /* 저장소를 못 쓰면 매번 보여 준다. */ }
  // 서버 렌더에는 없고 기기 설정을 읽은 뒤에만 띄운다(닫은 사람에게 깜빡이지 않게).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  if (!closed) setOpen(true);
 }, []);
 if (!open) return null;
 return <div className="beta-banner" role="status">
  <p><strong>끼니플랜은 현재 베타 서비스입니다.</strong> 예상치 못한 동작이나 데이터 손실이 발생할 수 있습니다. 여러분의 피드백이 개선에 큰 도움이 됩니다.</p>
  <button type="button" aria-label="베타 안내 닫기" onClick={() => { setOpen(false); try { localStorage.setItem(KEY, '1'); } catch { /* 이번 방문 동안만 닫힌다. */ } }}>
   <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
  </button>
 </div>;
}
