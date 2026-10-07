'use client';
import {useEffect,useState} from 'react';
import {Button,Notice} from './components/ui';
import type {NearbyMart} from '../lib/nearby-marts';
import './nearby-marts.css';

// 동네 이름은 이 기기에만 남긴다(서버·분석 도구에 저장하지 않음). 기기 위치는 묻지 않는다.
const AREA_KEY='kkiniplan-mart-area-v1';
const won=(n:number)=>`${Math.round(n).toLocaleString('ko-KR')}원`;

export function NearbyMarts({ingredientNames}:{ingredientNames:string[]}){
 const [area,setArea]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[marts,setMarts]=useState<NearbyMart[]|null>(null);
 useEffect(()=>{let saved='';try{saved=localStorage.getItem(AREA_KEY)??'';}catch{/* 입력값만 사용 */}if(!saved)return;const frame=requestAnimationFrame(()=>setArea(saved));return()=>cancelAnimationFrame(frame);},[]);
 async function search(event:React.FormEvent){
  event.preventDefault();
  const value=area.trim();
  if(value.length<2){setError('동네 이름을 두 글자 이상 적어 주세요.');return;}
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/nearby-marts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({area:value,items:ingredientNames})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error);
   setMarts(data.marts);
   try{localStorage.setItem(AREA_KEY,value);}catch{/* 다음에 다시 입력 */}
  }catch(e){setError(e instanceof Error&&e.message?e.message:'마트 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');}
  finally{setBusy(false);}
 }
 const surveyed=marts?.some(m=>m.offers.length);
 return <details className="nearby-marts">
  <summary>근처 마트에서 사기</summary>
  <form onSubmit={search} className="nearby-marts-form">
   <label>동네 이름<input value={area} maxLength={40} onChange={e=>setArea(e.target.value)} placeholder="예: 망원동, 해운대" enterKeyHint="search"/></label>
   <Button type="submit" variant="secondary" disabled={busy}>{busy?'찾는 중…':'마트 찾기'}</Button>
  </form>
  {error&&<Notice tone="error">{error}</Notice>}
  {marts&&!marts.length&&<p className="nearby-marts-empty">이 동네에서 마트를 찾지 못했어요. 동 이름이나 역 이름으로 다시 찾아보세요.</p>}
  {marts&&marts.length>0&&<ul className="nearby-marts-list">{marts.map(m=><li key={m.id}>
   <a href={m.url} target="_blank" rel="noopener noreferrer" aria-label={`${m.name} 지도에서 보기 (새 창)`}><strong>{m.name}</strong><small>{m.address}</small></a>
   {m.offers.length>0?<div className="nearby-marts-offers"><p>참가격 조사 가격 · {m.offers[0].date.slice(5).replace('-','/')}</p><ul>{m.offers.map(o=><li key={o.ingredient}><span className="nearby-marts-ingredient">{o.ingredient}</span><span className="nearby-marts-product">{o.product}</span><b>{won(o.price)}</b></li>)}</ul></div>:<p className="nearby-marts-unsurveyed">{m.surveyed?'참가격 조사 매장이지만 이 메뉴 재료는 조사 품목에 없어요':'참가격 조사 매장이 아니라 가격 정보가 없어요'}</p>}
  </li>)}</ul>}
  {marts&&marts.length>0&&<small className="nearby-marts-note">{surveyed?'조사 가격은 한국소비자원 참가격이 해당 매장에서 조사한 날의 가격이에요. 지금 판매가와 다를 수 있어요. 재료마다 가장 싼 조사 상품 하나씩 보여 줘요.':'찾은 마트 중 한국소비자원 참가격 조사 매장이 없어 가격을 보여 줄 수 없어요.'} 입력한 동네는 이 기기에만 저장해요.</small>}
 </details>;
}
