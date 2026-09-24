import type { MetadataRoute } from "next";
import { indexable, siteUrl } from "../lib/seo";
import { guides } from "../lib/guides";
import {getTaiwanCatalog,twCategories,taiwanFoodGroups} from '../lib/taiwan-catalog';
import {getKoreanProducts,koreanFoodGroups} from '../lib/korean-products';
import {twFoodPath} from '../lib/taiwan-comparison';
import {foodPath,productPath} from '../lib/product-comparison';
import {foodPagePath,foodPageSlugs} from '../lib/food-pages';
export const revalidate=3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!indexable) return [];
  const [korean,groups,twGroups,foodSlugs]=await Promise.all([getKoreanProducts(),koreanFoodGroups(),taiwanFoodGroups(),foodPageSlugs().catch(()=>[] as string[])]);
  return [...["/", "/deals", "/products", ...groups.map(g=>foodPath(g.key)), "/tw", "/tw/products", ...twGroups.map(g=>twFoodPath(g.key)),  ...Object.keys(twCategories).map(key=>'/tw/categories/'+key), "/guides", ...guides.map(g => "/guides/" + g.slug), "/kcal", ...foodSlugs.map(foodPagePath)].map(path => ({ url: siteUrl + path })),...korean.map(p=>({url:siteUrl+productPath(p.id),...(p.updatedAt?{lastModified:new Date(p.updatedAt)}:{})})),...(await getTaiwanCatalog()).map(p=>({url:siteUrl+'/tw/products/'+p.id,...(p.updatedAt?{lastModified:new Date(p.updatedAt)}:{})}))];
}
