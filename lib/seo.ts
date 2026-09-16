import type { Metadata } from "next";

export const siteUrl = new URL(process.env.SITE_URL || "https://gginiplan.kr").origin;
export const indexable = process.env.SEO_INDEXING_ENABLED === "true" && new URL(siteUrl).protocol === "https:" && !["localhost", "127.0.0.1"].includes(new URL(siteUrl).hostname) && process.env.VERCEL_ENV !== "preview";
export function pageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title: { absolute: title }, description,
    alternates: { canonical: siteUrl + path },
    openGraph: { title, description, siteName: "끼니플랜", locale: "ko_KR", type: "website", url: siteUrl + path },
    twitter: { card: "summary", title, description },
  };
}
