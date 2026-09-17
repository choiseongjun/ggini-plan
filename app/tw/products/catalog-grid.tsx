import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getTaiwanCatalog,taiwanFoodGroups,twCategories,twMetadata,type TwCategory} from '../../../lib/taiwan-catalog';
import type {TaiwanFoodKind} from '../../../lib/taiwan-food-types';
import {filterComparison,type ComparisonSort} from '../../../lib/product-comparison';
import {twComparisonSorts,twFoodPath} from '../../../lib/taiwan-comparison';
import {indexable} from '../../../lib/seo';
import {ComparisonBoard} from './comparison-board';
export type TwProductSearch=Record<string,string|string[]|undefined>;
export function twListingOptions(search:TwProductSearch){
 const single=(key:string)=>{const value=search[key];if(Array.isArray(value))notFound();return value;};
 const raw=single('page')??'1',q=single('q')??'',sort=single('sort')??'name';
 if(!/^[1-9]\d*$/.test(raw)||Number(raw)>1000||q.length>100||!Object.hasOwn(twComparisonSorts,sort))notFound();
 return {page:Number(raw),q,sort:sort as ComparisonSort};
}
export async function twListingData(search:TwProductSearch,category?:TwCategory,foodKind?:TaiwanFoodKind){
 const opts=twListingOptions(search);
 const all=(await getTaiwanCatalog()).filter(p=>(!category||p.category===twCategories[category].category)&&(!foodKind||p.foodKind===foodKind));
 const filtered=filterComparison(all,opts.q,opts.sort,'zh-TW'),pages=Math.max(1,Math.ceil(filtered.length/24));
 if(opts.page>pages)notFound();return {...opts,all,filtered,pages,items:filtered.slice((opts.page-1)*24,opts.page*24)};
}
export function twListingMetadata(title:string,description:string,base:string,search:TwProductSearch){const {page,q,sort}=twListingOptions(search);return {...twMetadata(title+(page>1?'・第 '+page+' 頁':''),description,base+(page>1?'?page='+page:'')),robots:{index:indexable&&!q&&sort==='name',follow:true}};}
export default async function CatalogGrid({category,foodKind,search={}}:{category?:TwCategory;foodKind?:TaiwanFoodKind;search?:TwProductSearch}){
 const data=await twListingData(search,category,foodKind),groups=await taiwanFoodGroups();
 const base=foodKind?twFoodPath(foodKind):category?'/tw/categories/'+category:'/tw/products';
 const pageLink=(page:number)=>{const params=new URLSearchParams();if(data.q)params.set('q',data.q);if(data.sort!=='name')params.set('sort',data.sort);if(page>1)params.set('page',String(page));return base+(params.size?'?'+params.toString():'');};
 return <><nav className="food-group-links" aria-label="食品分類"><Link href="/tw/products" aria-current={!category&&!foodKind?'page':undefined}>所有商品</Link>{Object.entries(twCategories).map(([key,v])=><Link key={key} href={'/tw/categories/'+key} aria-current={category===key?'page':undefined}>{v.label}</Link>)}{groups.map(g=><Link key={g.key} href={twFoodPath(g.key)} aria-current={foodKind===g.key?'page':undefined}>{g.label} <span>{g.count}</span></Link>)}</nav>
 <form action={base} className="product-search"><label>搜尋商品<input name="q" type="search" defaultValue={data.q} maxLength={100} placeholder="輸入品牌或商品名稱"/></label><label>排序<select name="sort" defaultValue={data.sort}>{Object.entries(twComparisonSorts).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><button type="submit">套用</button>{(data.q||data.sort!=='name')&&<Link href={base}>重設</Link>}</form>
 <p>共 {data.filtered.length} 件商品 · 第 {data.page} / {data.pages} 頁</p>{(data.sort==='protein'||data.sort==='calories')&&<p className="products-note">先依每 100g 可比較的營養數值排序。以 mL 標示或資料不足的商品列在後面。</p>}
 {data.items.length?<ComparisonBoard key={JSON.stringify([base,data.page,data.q,data.sort])} items={data.items}/>:<p className="products-note">沒有符合條件的商品，請調整搜尋內容。</p>}
 <nav className="products-pagination" aria-label="商品分頁">{data.page>1&&<Link href={pageLink(data.page-1)}>← 上一頁</Link>}<span>{data.page} / {data.pages}</span>{data.page<data.pages&&<Link href={pageLink(data.page+1)}>下一頁 →</Link>}</nav></>;
}
