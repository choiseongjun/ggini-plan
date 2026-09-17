import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ComparisonBoard} from './comparison-board';
import {getKoreanProducts,koreanFoodGroups} from '../../lib/korean-products';
import type {FoodType} from '../../lib/catalog-food-types';
import {comparisonSorts,filterComparison,foodPath,type ComparisonSort} from '../../lib/product-comparison';
import {pageMetadata,indexable} from '../../lib/seo';

export type ProductSearch=Record<string,string|string[]|undefined>;
export const pageSize=24;
export function listingOptions(search:ProductSearch){
 const single=(key:string)=>{const v=search[key];if(Array.isArray(v))notFound();return v;};
 const rawPage=single('page')??'1',q=single('q')??'',sort=single('sort')??'name';
 if(!/^[1-9]\d*$/.test(rawPage)||Number(rawPage)>1000||q.length>100||!Object.hasOwn(comparisonSorts,sort))notFound();
 return {page:Number(rawPage),q,sort:sort as ComparisonSort};
}
export async function listingData(search:ProductSearch,foodType?:FoodType){
 const options=listingOptions(search);
 const all=(await getKoreanProducts()).filter(p=>!foodType||p.foodType===foodType);
 const filtered=filterComparison(all,options.q,options.sort);
 const pages=Math.max(1,Math.ceil(filtered.length/pageSize));if(options.page>pages)notFound();
 return {...options,all,filtered,pages,items:filtered.slice((options.page-1)*pageSize,options.page*pageSize)};
}
export function listingMetadata(title:string,description:string,base:string,search:ProductSearch){
 const {page,q,sort}=listingOptions(search);
 const path=base+(page>1?`?page=${page}`:'');
 return {...pageMetadata(`${title}${page>1?` · ${page}페이지`:''} | 끼니플랜`,description,path),robots:{index:indexable&&!q&&sort==='name',follow:true}};
}
export async function ProductListing({base,search,foodType}:{base:string;search:ProductSearch;foodType?:FoodType}){
 const data=await listingData(search,foodType),groups=await koreanFoodGroups();
 const pageLink=(page:number)=>{const q=new URLSearchParams();if(data.q)q.set('q',data.q);if(data.sort!=='name')q.set('sort',data.sort);if(page>1)q.set('page',String(page));return base+(q.size?'?'+q.toString():'');};
 return <><nav className="food-group-links" aria-label="음식 종류"><Link href="/products" aria-current={!foodType?'page':undefined}>전체 상품</Link>{groups.map(g=><Link key={g.key} href={foodPath(g.key)} aria-current={foodType===g.key?'page':undefined}>{g.label} <span>{g.count}</span></Link>)}</nav>
  <form action={base} className="product-search"><label>상품명 검색<input type="search" name="q" defaultValue={data.q} maxLength={100} placeholder="브랜드나 상품명"/></label><label>정렬<select name="sort" defaultValue={data.sort}>{Object.entries(comparisonSorts).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><button type="submit">적용</button>{(data.q||data.sort!=='name')&&<Link href={base}>초기화</Link>}</form>
  <p>{data.filtered.length}개 상품 · {data.page}/{data.pages}페이지</p>{(data.sort==='protein'||data.sort==='calories')&&<p className="products-note">100g 기준으로 비교 가능한 상품부터 정렬해요. mL 기준·미확인 상품은 뒤에 표시합니다.</p>}
  {!data.items.length?<p className="products-note">조건에 맞는 상품이 없습니다. 검색어를 바꾸거나 <Link href="/submissions#submit">상품을 제보해 주세요.</Link></p>:<ComparisonBoard key={JSON.stringify([base,data.page,data.q,data.sort])} items={data.items}/>}
  <nav className="products-pagination" aria-label="상품 목록 페이지">{data.page>1&&<Link href={pageLink(data.page-1)}>← 이전</Link>}<span>{data.page} / {data.pages}</span>{data.page<data.pages&&<Link href={pageLink(data.page+1)}>다음 →</Link>}</nav>
 </>;
}
