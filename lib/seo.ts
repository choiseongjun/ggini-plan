import type { Metadata } from "next";

export const siteUrl = new URL(process.env.SITE_URL || "https://gginiplan.kr").origin;
// Production defaults to searchable after launch. Keep preview and local builds out.
// An explicit false remains available for staging and emergency exclusion.
const indexingRequested = process.env.SEO_INDEXING_ENABLED === "true" ||
  (process.env.SEO_INDEXING_ENABLED !== "false" && process.env.NODE_ENV === "production");
export const indexable = indexingRequested && new URL(siteUrl).protocol === "https:" && !["localhost", "127.0.0.1"].includes(new URL(siteUrl).hostname) && (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production");
export function pageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title: { absolute: title }, description,
    alternates: { canonical: siteUrl + path },
    openGraph: { title, description, siteName: "끼니플랜", locale: "ko_KR", type: "website", url: siteUrl + path },
    twitter: { card: "summary", title, description },
  };
}
