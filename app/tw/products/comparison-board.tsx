'use client';
import {useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type {CatalogItem} from '../../../lib/catalog';
const catalogCategories={ingredient:'食材',meal_kit:'料理包',frozen_meal:'冷凍食品',ready_meal:'即食餐點',other:'其他'};
import {comparableNutrition} from '../../../lib/product-comparison';
import {twComparablePrice as comparablePrice,twNutritionDisplay as nutritionDisplay,twProductPath as productPath} from '../../../lib/taiwan-comparison';
import {twMoney as comparisonWon} from '../../../lib/taiwan-plan';

export function ComparisonBoard({items}:{items:CatalogItem[]}){
 const [ids,setIds]=useState<string[]>([]);
 const selected=items.filter(p=>ids.includes(p.id));
 function toggle(id:string){setIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):prev.length<4?[...prev,id]:prev);}
 return <>
  <div className="comparison-status" role="status">本頁最多選 4 件 · {ids.length}/4 {ids.length>0&&<><a href="#selected-products">查看比較表 ↓</a><button type="button" onClick={()=>setIds([])}>清除選擇</button></>}</div>
  <div className="products-grid">{items.map(p=>{const n=comparableNutrition(p),price=comparablePrice(p);return <article className="product-card" key={p.id}>
   <label className="product-pick"><input type="checkbox" checked={ids.includes(p.id)} disabled={!ids.includes(p.id)&&ids.length>=4} onChange={()=>toggle(p.id)} aria-label={`${p.name} 加入比較`}/>加入比較</label>
   <Link href={productPath(p.id)} className="product-card-heading">{p.productImageUrl?<Image unoptimized src={p.productImageUrl} width={200} height={160} alt={p.name}/>:<span className="product-image-placeholder" aria-hidden="true">{p.emoji}</span>}<small>{catalogCategories[p.category]}</small><h2>{p.name}</h2></Link>
   <strong className="product-price">{comparisonWon(p.price)}{p.priceNote?.includes('起價')?'起':''}</strong><p>{p.detail}</p>
   <small>{price?`${price.basis} ${comparisonWon(price.amount)} · 依販售規格`:'單位價格尚未確認'}</small>
   <p className="product-nutrition">{n.unit?<>100{n.unit} <b>{nutritionDisplay(n.calories,' kcal')}</b><br/>蛋白質 {nutritionDisplay(n.protein,'g')}</>:'營養基準尚待確認'}</p>
   <small>價格確認 {p.priceCheckedAt?.slice(0,10)??'尚未確認'}</small><Link className="product-detail-link" href={productPath(p.id)}>查看規格・營養・賣場 →</Link>
  </article>;})}</div>
  {selected.length>0&&<section className="selected-comparison" id="selected-products" tabIndex={-1}><h2>商品並排比較</h2><p>請以相同單位比較。100g 與 100mL 不互相換算。</p>{selected.length===1&&<p>再選一件商品，就能一起比較差異。</p>}<div className="comparison-table-scroll" tabIndex={0} role="region" aria-label="商品比較表，可橫向捲動"><table><caption>依已登錄的販售規格與來源</caption><thead><tr><th scope="col">比較項目</th>{selected.map(p=><th scope="col" key={p.id}><Link href={productPath(p.id)}>{p.name}</Link><button className="comparison-remove" type="button" aria-label={`${p.name} 移除比較`} onClick={()=>toggle(p.id)}>移除比較</button></th>)}</tr></thead><tbody>
   <tr><th scope="row">販售價格</th>{selected.map(p=><td key={p.id}>{comparisonWon(p.price)}{p.priceNote?.includes('起價')?'起':''}<small>{p.priceNote}</small></td>)}</tr>
   <tr><th scope="row">販售規格</th>{selected.map(p=><td key={p.id}>{p.detail}<small>登錄數量 {p.quantity}{p.unit==='개'?' 個販售單位':p.unit}</small></td>)}</tr>
   <tr><th scope="row">單位價格</th>{selected.map(p=>{const price=comparablePrice(p);return <td key={p.id}>{price?`${price.basis} ${comparisonWon(price.amount)}`:'尚未確認'}</td>;})}</tr>
   <tr><th scope="row">原文營養基準</th>{selected.map(p=><td key={p.id}>{p.nutritionBasis??'尚未確認'}</td>)}</tr>
   {([['calories','熱量',' kcal'],['protein','蛋白質','g'],['carbs','碳水化合物','g'],['fat','脂肪','g'],['sodium','鈉','mg']] as const).map(([key,label,unit])=><tr key={key}><th scope="row">{label}</th>{selected.map(p=>{const n=comparableNutrition(p);return <td key={p.id}>{nutritionDisplay(n[key],unit)}{n.unit&&<small>100{n.unit} 基準</small>}</td>;})}</tr>)}
   <tr><th scope="row">賣場</th>{selected.map(p=><td key={p.id}><a href={p.productUrl!} target="_blank" rel="noopener noreferrer">確認販售規格 ↗</a></td>)}</tr>
  </tbody></table></div></section>}
 </>;
}
