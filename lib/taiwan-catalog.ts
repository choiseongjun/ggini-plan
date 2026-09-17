import {cache} from 'react';
import {catalogItems} from './catalog-db';
import {marketContext} from './regional-db';
import {getPool} from './db';
import {siteUrl} from './seo';
import type {Metadata} from 'next';

export const twCategories={ingredients:{label:'生鮮食材',category:'ingredient',description:'比較蔬菜、肉類、海鮮、豆製品與日常食材的販售價格。先看包裝規格，再依實際使用量安排餐費。'},frozen:{label:'冷凍食品',category:'frozen_meal',description:'查看冷凍主食與調理食品的包裝售價。整包價格與一餐成本不同，先確認份量，再安排購物預算。'},ready:{label:'即食餐點',category:'ready_meal',description:'找方便準備的即食食品，查看販售單位、參考價格與購買來源，依自己的用餐需求選擇。'}} as const;
export type TwCategory=keyof typeof twCategories;
export const getTaiwanCatalog=cache(async()=>{
 const items=await catalogItems(await marketContext('TW','zh-TW'));
 const details=(await getPool().query<{product_id:string;seller_name:string;category_path:string[];pack_label:string}>(`SELECT d.product_id,d.seller_name,d.category_path,d.pack_label FROM catalog_source_details d JOIN catalog_items c ON c.id=d.product_id WHERE c.market_code='TW'`)).rows;
 const profiles=(await getPool().query<{product_id:string;servings:string}>(`SELECT p.product_id,p.servings FROM catalog_serving_profiles p JOIN catalog_items c ON c.id=p.product_id WHERE c.market_code='TW'`)).rows;
 return items.map(item=>({ ...item,source:details.find(d=>d.product_id===item.id),servings:profiles.find(p=>p.product_id===item.id)?.servings??null}));
});
export function twMetadata(title:string,description:string,path:string):Metadata{return {title:{absolute:title+' | Kkini Plan 台灣'},description,alternates:{canonical:siteUrl+path},openGraph:{title,description,locale:'zh_TW',url:siteUrl+path,siteName:'Kkini Plan 台灣',type:'website'},twitter:{card:'summary',title,description}};}
export const safeJson=(value:unknown)=>JSON.stringify(value).replaceAll('<','\\u003c');
