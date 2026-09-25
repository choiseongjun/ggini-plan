'use client';
import {useCallback,useEffect,useId,useRef,useState} from 'react';
import type {NearbyRestaurant,RestaurantSearch,MapPoint} from '../lib/nearby-restaurants';
import './nearby-restaurants.css';
import {RestaurantMap} from './restaurant-map';
import {RestaurantContent} from './restaurant-content';
const noPlaces:NearbyRestaurant[]=[];
type Results={places:NearbyRestaurant[];label:string};
export function NearbyRestaurants({menu,embedded=false}:{menu:string;embedded?:boolean}){
 const id=useId();
 const [open,setOpen]=useState(false),[area,setArea]=useState(''),[radius,setRadius]=useState(3000);
 const [query,setQuery]=useState(menu);
 const [origin,setOrigin]=useState<MapPoint|null>(null),[selected,setSelected]=useState<string|null>(null);
 const selectRestaurant=useCallback((placeId:string)=>{setSelected(placeId);document.getElementById(`${id}-place-${placeId}`)?.scrollIntoView({behavior:'smooth',block:'nearest'});},[id]);
 const [manual,setManual]=useState(false),[locating,setLocating]=useState(false);
 const [locationConsent,setLocationConsent]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[results,setResults]=useState<Results|null>(null);
 const active=useRef<AbortController|null>(null),version=useRef(0);
 useEffect(()=>()=>{version.current++;active.current?.abort();},[]);
 async function search(input:RestaurantSearch,label:string,token:number){
  const controller=new AbortController();active.current?.abort();active.current=controller;
  try{
   const r=await fetch('/api/nearby-restaurants',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:controller.signal});
   const data=await r.json();if(!r.ok)throw new Error(data.error);
   if(token===version.current)setResults({places:data.places,label});
  }catch(e){if(token===version.current&&!controller.signal.aborted)setError(e instanceof Error?e.message:'식당을 찾지 못했어요.');}
  finally{if(token===version.current)setBusy(false);}
 }
 function start(){const token=++version.current;active.current?.abort();setBusy(true);setError('');setResults(null);setSelected(null);return token;}
 function nearby(nextRadius=radius){
  const token=start();setOrigin(null);setLocating(true);
  if(!navigator.geolocation){setLocating(false);setManual(true);setBusy(false);setError('이 브라우저에서는 위치를 확인할 수 없어요. 동네를 직접 입력해 주세요.');return;}
  navigator.geolocation.getCurrentPosition(p=>{if(token===version.current){setLocating(false);const point={latitude:Math.round(p.coords.latitude*1000)/1000,longitude:Math.round(p.coords.longitude*1000)/1000};setOrigin(point);void search({menu:query.trim(),...point,radius:nextRadius},`${query.trim()} · 내 위치에서 ${nextRadius/1000}km · 가까운 순`,token);}},()=>{if(token===version.current){setLocating(false);setManual(true);setBusy(false);setError('위치를 확인하지 못했어요. 위치 권한을 허용하거나 동네를 입력해 주세요.');}},{enableHighAccuracy:false,timeout:10000,maximumAge:60000});
 }
 return <div className="nearby-restaurants">
  {!embedded&&<button type="button" className="nearby-toggle" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>이 메뉴, 근처에서 찾기<span aria-hidden="true">{open?'−':'+'}</span></button>}
  {(embedded||open)&&<div className="nearby-body" id={id}>
   <div className="nearby-heading"><strong>{menu} 먹을 곳 찾기</strong>
   <button type="button" className="nearby-adjust" aria-expanded={manual} disabled={busy} onClick={()=>setManual(!manual)}>{manual?'검색 조건 접기':'다른 동네·메뉴로 찾기'}</button></div>
   {manual&&<label className="nearby-menu">검색할 메뉴<input value={query} maxLength={60} disabled={busy} onChange={e=>setQuery(e.target.value)}/></label>}
   <div className="nearby-privacy"><p>내 위치로 찾기를 누르면 대략적인 위치·검색 메뉴는 카카오에, 지도 표시 위치는 네이버 클라우드에 전달해요.</p><p>위치는 계정에 저장하거나 백그라운드에서 추적하지 않아요. 위치 제공 없이 동네 이름으로도 검색할 수 있어요.</p><a href="/privacy#nearby-location">위치정보 처리 안내 ↗</a></div>
   <div className="nearby-location"><button type="button" disabled={busy||!query.trim()} onClick={()=>{setLocationConsent(true);nearby();}}>{locationConsent?'내 위치로 다시 찾기':'동의하고 내 위치로 찾기'}</button><label>반경<select value={radius} disabled={busy} onChange={e=>setRadius(Number(e.target.value))}><option value={1000}>1km</option><option value={3000}>3km</option><option value={5000}>5km</option></select></label></div>
   {manual&&<form className="nearby-area" onSubmit={e=>{e.preventDefault();if(area.trim().length<2||!query.trim()||busy)return;const token=start();setOrigin(null);void search({menu:query.trim(),area:area.trim(),radius},`${area.trim()} · ${query.trim()} · 관련도순`,token);}}><label htmlFor={`${id}-area`}>또는 동네·역 이름으로 찾기</label><div><input id={`${id}-area`} placeholder="예: 강남역, 연남동" value={area} maxLength={60} minLength={2} required disabled={busy} onChange={e=>setArea(e.target.value)}/><button type="submit" disabled={busy||!query.trim()||area.trim().length<2}>검색</button></div></form>}
   {busy&&<p role="status">{locating?'현재 위치를 확인하고 있어요…':'가까운 식당을 찾고 있어요…'}</p>}{error&&<p className="nearby-error" role="alert">{error}</p>}
   {(origin||results?.places.some(p=>p.position))&&<RestaurantMap origin={origin} places={results?.places??noPlaces} onSelect={selectRestaurant}/>}
   {results&&<><p className="nearby-results-label" role="status">{results.label} · {results.places.length}곳</p>{results.places.length?<ul className="nearby-list">{results.places.map((p,index)=><li key={p.id} id={`${id}-place-${p.id}`} className={selected===p.id?'is-selected':undefined}><div><strong><span className="nearby-number">{index+1}</span>{p.name}</strong>{p.distance!==null&&<span>{p.distance<1000?`${Math.round(p.distance)}m`:`${(p.distance/1000).toFixed(1)}km`}</span>}</div><small>{p.category}</small><p>{p.address}</p><div className="nearby-links"><a href={p.url} target="_blank" rel="noopener noreferrer">상세·길찾기 ↗</a>{p.phone&&<a href={`tel:${p.phone.replace(/[^\d+]/g,'')}`}>전화</a>}</div><RestaurantContent name={p.name} address={p.address}/></li>)}</ul>:<p>검색된 식당이 없어요. 다른 동네를 입력하거나 반경을 넓혀 다시 찾아보세요.</p>}<small className="nearby-source">장소 정보 · 카카오맵 / 지도 · 네이버. 검색 결과이며 메뉴 판매·가격·영업 여부는 방문 전 확인해 주세요. 위 영양정보는 해당 식당의 분석값이 아니에요.</small></>}
  </div>}
 </div>;
}
