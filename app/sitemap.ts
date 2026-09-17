import type { MetadataRoute } from "next";
import { indexable, siteUrl } from "../lib/seo";
import { guides } from "../lib/guides";
import {getTaiwanCatalog,twCategories} from '../lib/taiwan-catalog';
import {getKoreanProducts,koreanFoodGroups} from '../lib/korean-products';
import {foodPath,productPath} from '../lib/product-comparison';
export const revalidate=3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!indexable) return [];
  const [korean,groups]=await Promise.all([getKoreanProducts(),koreanFoodGroups()]);
  return [...["/", "/products", ...groups.map(g=>foodPath(g.key)), "/tw", "/tw/products", ...Object.keys(twCategories).map(key=>'/tw/categories/'+key), "/guides", ...guides.map(g => "/guides/" + g.slug)].map(path => ({ url: siteUrl + path })),...korean.map(p=>({url:siteUrl+productPath(p.id),...(p.updatedAt?{lastModified:new Date(p.updatedAt)}:{})})),...(await getTaiwanCatalog()).map(p=>({url:siteUrl+'/tw/products/'+p.id,...(p.updatedAt?{lastModified:new Date(p.updatedAt)}:{})}))];
}
