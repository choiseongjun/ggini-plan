import type { MetadataRoute } from "next";
import { indexable, siteUrl } from "../lib/seo";
import { guides } from "../lib/guides";
import {getTaiwanCatalog,twCategories} from '../lib/taiwan-catalog';
export const revalidate=3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!indexable) return [];
  return [...["/", "/tw", "/tw/products", ...Object.keys(twCategories).map(key=>'/tw/categories/'+key), "/guides", ...guides.map(g => "/guides/" + g.slug)].map(path => ({ url: siteUrl + path })),...(await getTaiwanCatalog()).map(p=>({url:siteUrl+'/tw/products/'+p.id,...(p.updatedAt?{lastModified:new Date(p.updatedAt)}:{})}))];
}
