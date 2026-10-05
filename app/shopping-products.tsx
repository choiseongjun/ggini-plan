'use client';
import {useEffect,useState} from 'react';
import Image from 'next/image';
import {cachedJson,invalidateJson} from '../lib/client-cache';
import type {ShoppingProduct,ShoppingProductGroup} from '../lib/shopping-products';
import {Icon} from './components/icons';
import './shopping-products.css';

export function useShoppingProducts(names:string[],enabled:boolean){
  const key=JSON.stringify(enabled?[...new Set(names)].sort():[]);
  const [result,setResult]=useState<{key:string;groups:ShoppingProductGroup[];error:boolean}|null>(null);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    const list=JSON.parse(key) as string[];
    if(!list.length)return;
    let alive=true;
    const load=async()=>{
      const groups:ShoppingProductGroup[]=[];
      for(let i=0;i<list.length;i+=40){
        if(!alive)return;
        const params=new URLSearchParams();list.slice(i,i+40).forEach(name=>params.append('name',name));
        const data=await cachedJson<{groups:ShoppingProductGroup[]}>(`/api/shopping-products?${params}`);
        groups.push(...data.groups);
      }
      if(alive)setResult({key,groups,error:false});
    };
    void load().catch(()=>{if(alive)setResult({key,groups:[],error:true});});
    return()=>{alive=false;};
  },[key,revision]);
  const current=result?.key===key?result:null;
  return {groups:current?.groups??[],loading:enabled&&!current,error:current?.error??false,retry:()=>{invalidateJson('/api/shopping-products?');setResult(null);setRevision(n=>n+1);}};
}

function ProductPhoto({product}:{product:ShoppingProduct}){
  const [failed,setFailed]=useState(false);
  return <span className="cart-offer-photo">{product.productImageUrl&&!failed?<Image src={product.productImageUrl} alt="" width={56} height={56} unoptimized onError={()=>setFailed(true)}/>:<Icon name="bag"/>}</span>;
}

export function ShoppingProducts({name,products,loading,error,onRetry}:{name:string;products:ShoppingProduct[];loading:boolean;error:boolean;onRetry:()=>void}){
  return <section className="cart-offers" aria-label={`${name} 판매 상품`}>
    <h4>살 수 있는 상품</h4>
    {loading?<p role="status">상품과 가격을 불러오고 있어요…</p>:error?<p role="status">판매 상품을 불러오지 못했어요. <button type="button" onClick={onRetry}>다시 불러오기</button></p>:!products.length?<p>이 재료와 맞는 판매 상품이 아직 등록되지 않았어요. 위 금액은 추정 재료비예요.</p>:<>
      <ul>{products.map(product=><li key={product.id}>
        <ProductPhoto product={product}/>
        <div className="cart-offer-info"><small>{product.seller}</small><strong>{product.name}</strong><span>{product.detail}</span>
          <b>{product.price.toLocaleString('ko-KR')}원{product.priceNote?.includes('시작가')?'부터':''}</b>
          {product.unit==='g'&&product.quantity>0&&<small>100g당 {Math.round(product.price/product.quantity*100).toLocaleString('ko-KR')}원</small>}
          <small>{product.priceCheckedAt&&Number.isFinite(Date.parse(product.priceCheckedAt))?`${new Date(product.priceCheckedAt).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'})} 가격 확인`:'가격 확인일 미등록'}</small>
          <a href={product.productUrl} target="_blank" rel="noopener noreferrer" aria-label={`${product.name} ${product.seller}에서 구매하기`}>구매하기 <Icon name="arrow" size={15}/></a>
        </div>
      </li>)}</ul>
      <p>등록된 판매가예요. 상품마다 용량이 다르며, 현재 가격·배송비는 결제 전 확인해 주세요.</p>
    </>}
  </section>;
}
