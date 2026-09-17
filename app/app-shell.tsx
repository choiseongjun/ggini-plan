'use client';
import Link from 'next/link';
import type {ReactNode} from 'react';
import {RiceBuddy} from './rice-buddy';
import {usePlannerLocale} from './planner-locale';
export type IconName = "home" | "bag" | "chart" | "user" | "chevron" | "arrow" | "check" | "spark" | "calendar" | "wallet" | "fire" | "close" | "edit" | "left";


export function Icon({ name, size = 20, strokeWidth = 1.8 }: { name: IconName; size?: number; strokeWidth?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/></>,
    bag: <><path d="M4 8h16l-1.3 12H5.3L4 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
    chart: <><path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    left: <path d="m15 18-6-6 6-6"/>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    spark: <><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z"/><path d="m19 17 .6 1.4L21 19l-1.4.6L19 21l-.6-1.4L17 19l1.4-.6L19 17Z"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>,
    wallet: <><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M3 9V5a2 2 0 0 1 2-2h13m-1 12h4m-3 0h.01"/></>,
    fire: <path d="M12 22c4.5 0 7-3.2 7-7 0-2.5-1.2-4.4-3-6-1 2-2 2.5-2 2.5C14 7 12 4.5 10 2c.5 4-1 5.5-3 7.5C5.5 11 5 12.8 5 15c0 3.8 2.5 7 7 7Z"/>,
    close: <path d="M5 5 19 19M19 5 5 19"/>,
    edit: <><path d="m4 20 4-.8L20 7a2.1 2.1 0 0 0-3-3L5 16l-1 4Z"/><path d="m15 6 3 3"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function Brand({ light = false }: { light?: boolean }) {
  const locale=usePlannerLocale(); return <Link href={locale.path("/")} aria-label={locale.isTaiwan?"GginiPlan 首頁":"끼니플랜 홈으로"} style={{textDecoration:"none"}} className={`brand ${light ? "brand-light" : ""}`}><span className="brand-mark"><span/><span/><span/><span/></span><span>{locale.isTaiwan?"GginiPlan":"끼니플랜"}<span className="brand-dot">.</span></span></Link>;
}


export function AppShell({children,overlay}:{children:ReactNode;overlay?:ReactNode}){const locale=usePlannerLocale();return locale.render(<main className="site-shell" lang={locale.isTaiwan?'zh-TW':'ko-KR'}>    <aside className="promo-panel" aria-label="끼니플랜 서비스 소개"><div className="promo-inner">
      <div className="promo-top"><Brand light/><span>MY WEEK, MY TABLE</span></div>
      <div className="promo-copy"><div className="eyebrow">혼자 사는 한 주도 잘 먹기 위한 계획</div><h1>장보기부터 식단까지,<br/><em>가볍게 챙겨요.</em></h1><p>간편식과 직접 요리하는 한 끼를 비교해<br/>내 예산에 맞는 장보기와 식단을 정해요.<br/>바쁜 일상에도 내 끼니는 놓치지 않게.</p><div className="promo-rule"><span>내 예산에 맞게</span><span>매일 맛있게</span><span>다음 주는 더 쉽게</span></div></div>
      <div className="promo-playground"><span className="promo-sticker sticker-one">잘 먹고 🥄</span><span className="promo-sticker sticker-two">조금씩 아끼고 🌱</span><div className="promo-buddy-circle"><RiceBuddy/></div><span className="promo-veggie veggie-one">🥦</span><span className="promo-veggie veggie-two">🍅</span><div className="promo-character-caption">밥 친구 끼니랑, 매일 한 끼씩.</div></div>
      <div className="promo-footer"><span>© 끼니플랜</span><span>GOOD FOOD, GOOD WEEK</span></div>
    </div></aside>
    <section className="app-side" aria-label="끼니플랜 앱"><div className="app-frame">
{children}</div></section>{overlay}</main>);}
