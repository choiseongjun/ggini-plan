'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import type {CatalogItem} from '../lib/catalog';
import {ProductThumb} from './product-thumb';
import {comparisonWon,productPath} from '../lib/product-comparison';
import './comparison-trends.css';
type Result={day:string;items:{item:CatalogItem;comparisons:number}[]};
export function ComparisonTrends(){
  const [data,setData]=useState<Result|null>(null),[failed,setFailed]=useState(false);
  useEffect(()=>{const c=new AbortController();fetch('/api/comparison-interest',{signal:c.signal}).then(async r=>{if(!r.ok)throw new Error();return r.json() as Promise<Result>;}).then(setData).catch(()=>{if(!c.signal.aborted)setFailed(true);});return()=>c.abort();},[]);
  return <section className="comparison-trends" aria-labelledby="comparison-trends-title"><div className="comparison-trends-heading"><div><span>최근 7일 · 끼니플랜</span><h2 id="comparison-trends-title">요즘 많이 비교한 음식</h2></div><Link href="/products">전체 비교 →</Link></div><p>끼니플랜에서 비교 대상으로 선택한 상품이에요. 판매량이나 구매 순위는 아니에요.</p>
    {failed?<p role="status">비교 기록을 불러오지 못했어요. 잠시 후 다시 방문해 주세요.</p>:!data?<p role="status">비교 기록을 불러오고 있어요.</p>:data.items.length?<ol>{data.items.map(({item,comparisons})=><li key={item.id}><Link href={productPath(item.id)}><ProductThumb item={item}/><div><strong>{item.name}</strong><span>{comparisonWon(item.price)} · 비교 선택 {comparisons}회</span></div><span aria-hidden="true">↗</span></Link></li>)}</ol>:<div className="comparison-trends-empty"><strong>비교 기록을 모으고 있어요</strong><p>최근 7일간 비교 선택이 3회 이상인 상품부터 보여드려요.</p><Link href="/products">관심 있는 음식 비교해 보기 →</Link></div>}
    <small>한국 시간 오늘 포함 7일 · 동일 접속 환경의 같은 상품 선택은 하루 1회 반영{data?` · ${data.day} 기준`:''}</small></section>;
}
