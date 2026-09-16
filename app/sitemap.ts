import type { MetadataRoute } from "next";
import { indexable, siteUrl } from "../lib/seo";
import { guides } from "../lib/guides";
export default function sitemap(): MetadataRoute.Sitemap {
  if (!indexable) return [];
  return ["/", "/guides", ...guides.map(g => "/guides/" + g.slug)].map(path => ({ url: siteUrl + path }));
}
