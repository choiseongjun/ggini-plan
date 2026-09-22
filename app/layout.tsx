import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { KakaoBrowser } from './kakao-browser';
import { pageMetadata, siteUrl, indexable } from "../lib/seo";
import "./globals.css";
import "./playful.css";
import { AppLoadingProvider } from './app-loading';
import './launch-polish.css';
import './interaction-motion.css';

export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',interactiveWidget:'resizes-content',themeColor:'#fffdf7'};

export const metadata: Metadata = {
  ...pageMetadata("내 식사에서 건강을 찾다 | 끼니플랜", "먹은 것과 먹을 것을 분석해, 내게 필요한 영양과 음식을 찾아주는 서비스. 부족한 영양을 채우는 한 끼 추천부터 식재료 가격 비교, 장보기 리스트까지 끼니플랜에서 함께 관리하세요.", "/"),
  metadataBase: new URL(siteUrl),
  applicationName: "끼니플랜",
  appleWebApp: { capable: true, title: '끼니플랜', statusBarStyle: 'default' },
  alternates: {canonical:siteUrl+'/',languages:{'ko-KR':siteUrl+'/','zh-TW':siteUrl+'/tw','x-default':siteUrl+'/'}},
  robots: { index: indexable, follow: indexable },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || "odBJGV5ju_G4snodV81Swxv7cLRrZdXJqDkATCFDUIE",
    other: process.env.NAVER_SITE_VERIFICATION ? { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION } : undefined,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="ko"><body><AppLoadingProvider>{children}</AppLoadingProvider><KakaoBrowser /><Analytics /><SpeedInsights /></body></html>;
}
