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
      <div className="promo-copy"><div className="eyebrow">메뉴 고민부터 식사 습관까지</div><h1>잘 먹는 일상,<br/><em>끼니와 함께.</em></h1><p>내 취향과 예산에 맞는 식단을 찾고,<br/>먹은 한 끼를 기록하며 나를 챙겨요.</p></div>
      <div className="promo-companion"><div className="promo-companion-art"><RiceBuddy animate/></div><div className="promo-companion-note"><span>나의 식사 친구, 끼니</span><strong>한 끼씩 기록하면<br/>나도 함께 자라요.</strong><p>스카프부터 요리사 모자까지,<br/>우리의 일상이 작은 선물이 돼요.</p></div></div>
      <ol className="promo-features" aria-label="끼니플랜으로 할 수 있는 일">
        <li><span className="promo-feature-icon"><Icon name="bag" size={23}/></span><div><strong>내게 맞는 식단부터 장보기까지</strong><p>취향·예산에 맞는 메뉴와 필요한 재료를 한 번에.</p></div></li>
        <li><span className="promo-feature-icon"><Icon name="chart" size={23}/></span><div><strong>한 끼 기록으로 살펴보는 식사 습관</strong><p>먹은 음식과 영양을 기록하고 주간 리포트로 돌아봐요.</p></div></li>
        <li><span className="promo-feature-icon"><Icon name="user" size={23}/></span><div><strong>기록할수록 자라는 나의 끼니</strong><p>성장 선물과 배지를 모아요. 쉬어도 성장은 그대로.</p></div></li>
      </ol>
      <div className="promo-footer"><span>© 끼니플랜</span><span>매일 완벽하지 않아도, 한 끼부터.</span></div>
    </div></aside>
    <section className="app-side" aria-label="끼니플랜 앱"><div className="app-frame">
{children}</div></section>{overlay}{!locale.isTaiwan&&<GuidedTour/>}</main>);}
