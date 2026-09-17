import Link from 'next/link';
import {getTaiwanCatalog,twCategories,type TwCategory} from '../../../lib/taiwan-catalog';
import {twMoney} from '../../../lib/taiwan-plan';
import {notFound} from 'next/navigation';
export default async function CatalogGrid({category,page=1}:{category?:TwCategory;page?:number}){
 const products=(await getTaiwanCatalog()).filter(p=>!category||p.category===twCategories[category].category);
 const pages=Math.max(1,Math.ceil(products.length/24));if(!Number.isInteger(page)||page<1||page>pages)notFound();
 const base=category?`/tw/categories/${category}`:'/tw/products';
 return <><nav className="tw-categories" aria-label="商品分類"><Link href="/tw/products" aria-current={!category?'page':undefined}>所有商品</Link>{Object.entries(twCategories).map(([key,v])=><Link key={key} href={'/tw/categories/'+key} aria-current={category===key?'page':undefined}>{v.label}</Link>)}</nav><p>共 {products.length} 件商品 · 第 {page} / {pages} 頁</p><div className="tw-catalog-grid">{products.slice((page-1)*24,page*24).map(p=><article key={p.id}><Link href={'/tw/products/'+p.id}><img src={p.productImageUrl??''} alt={p.name} loading="lazy" width="160" height="160"/><h2>{p.name}</h2></Link><strong>{twMoney(p.price)}</strong><p>{p.detail}</p><small>{p.servings?'已確認包裝餐數':'每餐份量尚待確認'} · {p.source?.seller_name??'桂冠官方商城'}</small></article>)}</div><nav className="tw-pagination" aria-label="商品分頁">{page>1&&<Link href={page===2?base:`${base}?page=${page-1}`}>← 上一頁</Link>}{page<pages&&<Link href={`${base}?page=${page+1}`}>下一頁 →</Link>}</nav></>;
}
