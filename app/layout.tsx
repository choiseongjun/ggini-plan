import type { Metadata } from "next";
import { pageMetadata, siteUrl, indexable } from "../lib/seo";
import "./globals.css";
import "./playful.css";
import { AppLoadingProvider } from './app-loading';

export const metadata: Metadata = {
  ...pageMetadata("자취 식단·일주일 식비·장보기 리스트 | 끼니플랜", "혼자 사는 일주일, 예산 안에서 잘 먹어요. 자취생을 위한 맞춤 식단 추천, 식재료 가격 비교, 장보기 리스트와 식비 기록을 끼니플랜에서 함께 관리하세요.", "/"),
  metadataBase: new URL(siteUrl),
  applicationName: "끼니플랜",
  robots: { index: indexable, follow: indexable },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || "odBJGV5ju_G4snodV81Swxv7cLRrZdXJqDkATCFDUIE",
    other: process.env.NAVER_SITE_VERIFICATION ? { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION } : undefined,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="ko"><body><AppLoadingProvider>{children}</AppLoadingProvider></body></html>;
}
