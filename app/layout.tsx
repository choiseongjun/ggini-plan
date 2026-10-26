import {ProductAnalytics,SiteAnalytics} from './product-analytics';
import {NativeSafeArea} from './native-safe-area';
import {RetiredModelCleanup} from './retired-model-cleanup';
import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { KakaoBrowser } from './kakao-browser';
import { DialogHistory } from './dialog-history';
import { pageMetadata, siteUrl, indexable } from "../lib/seo";
import {brandCopy} from '../lib/brand-copy';
import "./tokens.css";
import "./globals.css";
import "./playful.css";
import { AppLoadingProvider } from './app-loading';
import './launch-polish.css';
import './interaction-motion.css';
import './mobile-polish.css';

export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',interactiveWidget:'resizes-content',themeColor:'#f7f9fa'};

export const metadata: Metadata = {
  ...pageMetadata(brandCopy.title, brandCopy.description, "/"),
  metadataBase: new URL(siteUrl),
  applicationName: "끼니플랜",
  // Next's iTunes URL resolver treats custom schemes as an origin of "null".
  other: {'apple-itunes-app':'app-id=6816291997, app-argument=gginiplan:///'},
  appleWebApp: { capable: true, title: '끼니플랜', statusBarStyle: 'default' },
  alternates: {canonical:siteUrl+'/',languages:{'ko-KR':siteUrl+'/','zh-TW':siteUrl+'/tw','x-default':siteUrl+'/'}},
  robots: { index: indexable, follow: indexable },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || "odBJGV5ju_G4snodV81Swxv7cLRrZdXJqDkATCFDUIE",
    other: { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION || "103eba589a930e153779b94ae150cc9e156fc09b" },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="ko"><body><NativeSafeArea/><RetiredModelCleanup/><AppLoadingProvider>{children}</AppLoadingProvider><KakaoBrowser /><DialogHistory /><ProductAnalytics /><SiteAnalytics /><SpeedInsights /></body></html>;
}
