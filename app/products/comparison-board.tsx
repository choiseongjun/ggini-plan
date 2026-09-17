'use client';
import {useState} from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type {CatalogItem} from '../../lib/catalog';
import {catalogCategories} from '../../lib/catalog';
import {comparableNutrition,comparablePrice,comparisonWon,nutritionDisplay,productPath} from '../../lib/product-comparison';

export function ComparisonBoard({items}:{items:CatalogItem[]}){
 const [ids,setIds]=useState<string[]>([]);
 const selected=items.filter(p=>ids.includes(p.id));
 function toggle(id:string){setIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):prev.length<4?[...prev,id]:prev);}
 return <>
  <div className="comparison-status" role="status">이 페이지에서 최대 4개 선택 · {ids.length}/4 {ids.length>0&&<><a href="#selected-products">선택 상품 비교하기 ↓</a><button type="button" onClick={()=>setIds([])}>선택 해제</button></>}</div>
  <div className="products-grid">{items.map(p=>{const n=comparableNutrition(p),price=comparablePrice(p);return <article className="product-card" key={p.id}>
   <label className="product-pick"><input type="checkbox" checked={ids.includes(p.id)} disabled={!ids.includes(p.id)&&ids.length>=4} onChange={()=>toggle(p.id)} aria-label={`${p.name} 비교 선택`}/>비교 선택</label>
   <Link href={productPath(p.id)} className="product-card-heading">{p.productImageUrl?<Image unoptimized src={p.productImageUrl} width={200} height={160} alt={p.name}/>:<span className="product-image-placeholder" aria-hidden="true">{p.emoji}</span>}<small>{catalogCategories[p.category]}</small><h2>{p.name}</h2></Link>
   <strong className="product-price">{comparisonWon(p.price)}{p.priceNote?.includes('시작가')?'부터':''}</strong><p>{p.detail}</p>
   <small>{price?`${price.basis}당 ${comparisonWon(price.amount)} · 판매 구성 기준`:'단위 가격 미확인'}</small>
   <p className="product-nutrition">{n.unit?<>100{n.unit}당 <b>{nutritionDisplay(n.calories,' kcal')}</b><br/>단백질 {nutritionDisplay(n.protein,'g')}</>:'영양 기준량 확인 필요'}</p>
   <small>가격 확인 {p.priceCheckedAt?.slice(0,10)??'미확인'}</small><Link className="product-detail-link" href={productPath(p.id)}>구성·영양표·판매처 보기 →</Link>
  </article>;})}</div>
  {selected.length>0&&<section className="selected-comparison" id="selected-products" tabIndex={-1}><h2>선택한 상품 나란히 비교</h2><p>같은 기준 단위끼리 비교하세요. 100g과 100mL는 서로 환산하지 않아요.</p>{selected.length===1&&<p>상품을 하나 더 선택하면 차이를 확인하기 쉬워요.</p>}<div className="comparison-table-scroll" tabIndex={0} role="region" aria-label="선택 상품 비교표, 가로로 스크롤"><table><caption>등록된 판매 구성 및 출처 기준</caption><thead><tr><th scope="col">비교 항목</th>{selected.map(p=><th scope="col" key={p.id}><Link href={productPath(p.id)}>{p.name}</Link><button className="comparison-remove" type="button" aria-label={`${p.name} 비교에서 빼기`} onClick={()=>toggle(p.id)}>비교에서 빼기</button></th>)}</tr></thead><tbody>
   <tr><th scope="row">판매가</th>{selected.map(p=><td key={p.id}>{comparisonWon(p.price)}{p.priceNote?.includes('시작가')?'부터':''}<small>{p.priceNote}</small></td>)}</tr>
   <tr><th scope="row">판매 구성</th>{selected.map(p=><td key={p.id}>{p.detail}<small>등록 수량 {p.quantity}{p.unit}</small></td>)}</tr>
   <tr><th scope="row">단위 가격</th>{selected.map(p=>{const price=comparablePrice(p);return <td key={p.id}>{price?`${price.basis}당 ${comparisonWon(price.amount)}`:'미확인'}</td>;})}</tr>
   <tr><th scope="row">원문 영양 기준</th>{selected.map(p=><td key={p.id}>{p.nutritionBasis??'미확인'}</td>)}</tr>
   {([['calories','열량',' kcal'],['protein','단백질','g'],['carbs','탄수화물','g'],['fat','지방','g'],['sodium','나트륨','mg']] as const).map(([key,label,unit])=><tr key={key}><th scope="row">{label}</th>{selected.map(p=>{const n=comparableNutrition(p);return <td key={p.id}>{nutritionDisplay(n[key],unit)}{n.unit&&<small>100{n.unit} 기준</small>}</td>;})}</tr>)}
   <tr><th scope="row">판매처</th>{selected.map(p=><td key={p.id}><a href={p.productUrl!} target="_blank" rel="noopener noreferrer">판매 옵션 확인 ↗</a></td>)}</tr>
  </tbody></table></div></section>}
 </>;
}
