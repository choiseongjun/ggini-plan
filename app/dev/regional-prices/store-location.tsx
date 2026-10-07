'use client';
import {useCallback,useState} from 'react';
import {RestaurantMap} from '../../restaurant-map';
import type {NearbyRestaurant} from '../../../lib/nearby-restaurants';
import '../../nearby-restaurants.css';
export function StoreLocation({store}:{store:string}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [result,setResult]=useState<{places:NearbyRestaurant[];exact:boolean}|null>(null),[selected,setSelected]=useState('');
 const select=useCallback((id:string)=>setSelected(id),[]);
 async function show(){setOpen(true);if(result||busy)return;setBusy(true);setError('');try{const response=await fetch('/api/dev/store-location',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({store})});const body=await response.json();if(!response.ok)throw Error(body.error);setResult(body);}catch(e){setError(e instanceof Error?e.message:'위치를 불러오지 못했어요.');}finally{setBusy(false);}}
 return <div className="store-location"><button type="button" onClick={()=>open?setOpen(false):void show()} aria-expanded={open}>{open?'지도 닫기':'지도 보기'}</button>{open&&<div><strong>{store}</strong>{busy&&<p role="status">판매점 위치를 찾고 있어요…</p>}{error&&<p role="status">{error} <button type="button" onClick={()=>void show()}>다시 시도</button></p>}{result&&<><p>{result.exact?'지점명 일치 · 카카오 장소정보 기준':'검색된 위치 후보입니다. 지점명과 주소를 확인해주세요.'}</p>{result.places.length>0?<><RestaurantMap origin={null} places={result.places} onSelect={select} placeLabel="판매점"/>{result.places.map((p,i)=><div key={p.id} className={selected===p.id?'store-selected':''}><b>{i+1}. {p.name}</b><p>{p.address}</p><a href={p.url} target="_blank" rel="noreferrer">상세·길찾기</a></div>)}</>:<p>일치하는 판매점 위치를 찾지 못했어요.</p>}</>}<small>가격은 참가격 조사일 기준이며 현재 가격·재고를 보장하지 않습니다.</small></div>}</div>;
}
