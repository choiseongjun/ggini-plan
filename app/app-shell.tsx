'use client';

import Link from 'next/link';
import type {ReactNode} from 'react';
import {RiceBuddy} from './rice-buddy';
import {GuidedTour} from './guided-tour';
import {usePlannerLocale} from './planner-locale';
import './fresh-theme.css';
import {Icon} from './components/icons';
export {Icon,type IconName} from './components/icons';

export function Brand({ light = false }: { light?: boolean }) {
  const locale=usePlannerLocale(); return <Link href={locale.path("/")} aria-label={locale.isTaiwan?"GginiPlan 首頁":"끼니플랜 홈으로"} style={{textDecoration:"none"}} className={`brand ${light ? "brand-light" : ""}`}><span className="brand-mark"><span/><span/><span/><span/></span><span>{locale.isTaiwan?"GginiPlan":"끼니플랜"}<span className="brand-dot">.</span></span></Link>;
}


export function AppShell({children,overlay}:{children:ReactNode;overlay?:ReactNode}){const locale=usePlannerLocale();return locale.render(<main className="site-shell fresh-shell" lang={locale.isTaiwan?'zh-TW':'ko-KR'}>    <aside className="promo-panel" aria-label="끼니플랜 서비스 소개"><div className="promo-inner">
      <div className="promo-top"><Brand light/><span>나를 챙기는 한 끼의 시작</span></div>
      <div className="promo-copy"><div className="eyebrow">사진으로 남기는 식사·영양 기록</div><h1>한 끼를 기록하고,<br/><em>오늘의 나를 챙겨요.</em></h1><p>음식과 먹은 양을 확인하면,<br/>하루의 영양이 한눈에 보여요.</p></div>
      <div className="promo-companion"><div className="promo-companion-art"><RiceBuddy animate/></div><div className="promo-companion-note"><span>나의 식사 친구, 끼니</span><strong>한 끼씩 기록하면<br/>나도 함께 자라요.</strong><p>스카프부터 요리사 모자까지,<br/>우리의 일상이 작은 선물이 돼요.</p></div></div>
      <ol className="promo-features" aria-label="끼니플랜으로 할 수 있는 일">
        <li><span className="promo-feature-icon"><Icon name="edit" size={23}/></span><div><strong>사진으로 찾고, 먹은 양 확인</strong><p>사진 속 음식 후보를 고르거나 이름으로 찾아 기록해요.</p></div></li>
        <li><span className="promo-feature-icon"><Icon name="chart" size={23}/></span><div><strong>한 끼 기록으로 살펴보는 식사 습관</strong><p>먹은 음식과 영양을 기록하고 주간 리포트로 돌아봐요.</p></div></li>
        <li><span className="promo-feature-icon"><Icon name="user" size={23}/></span><div><strong>기록할수록 자라는 나의 끼니</strong><p>성장 선물과 배지를 모아요. 쉬어도 성장은 그대로.</p></div></li>
      </ol>
      <div className="promo-footer"><span>© 끼니플랜</span><span>매일 완벽하지 않아도, 한 끼부터.</span></div>
    </div></aside>
    <section className="app-side" aria-label="끼니플랜 앱"><div className="app-frame">
{children}</div></section>{overlay}{!locale.isTaiwan&&<GuidedTour/>}</main>);}
