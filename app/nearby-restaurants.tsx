'use client';
import {useCallback,useEffect,useId,useMemo,useRef,useState} from 'react';
import {restaurantKeywords,type RestaurantMatch} from '../lib/restaurant-discovery';
import type {RestaurantSearch} from '../lib/nearby-restaurants';
import {RestaurantMap} from './restaurant-map';
import {RestaurantContent} from './restaurant-content';
import './nearby-restaurants.css';

type Results={places:RestaurantMatch[];city:string;partial:boolean};
export function NearbyRestaurants({menu,embedded=false}:{menu:string;embedded?:boolean}){
 const id=useId();
 const [open,setOpen]=useState(false),[city,setCity]=useState('');
 const [filter,setFilter]=useState<'all'|'menu'|'similar'>('menu'),[limit,setLimit]=useState(5);
 const [selected,setSelected]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [results,setResults]=useState<Results|null>(null);
 const active=useRef<AbortController|null>(null),version=useRef(0);
 const query=restaurantKeywords(menu)[0];
 const selectedPlaces=useMemo(()=>results?.places.filter(p=>p.id===selected)??[],[results,selected]);
 const selectRestaurant=useCallback((placeId:string)=>setSelected(placeId),[]);
 useEffect(()=>()=>{version.current++;active.current?.abort();},[]);
 useEffect(()=>{if(selected)document.getElementById(`${id}-map-${selected}`)?.scrollIntoView({behavior:'smooth',block:'nearest'});},[id,selected]);
 async function search(nextCity=city,byLocation=false){
  const area=nextCity.trim();if((!byLocation&&area.length<2)||busy)return;
  const token=++version.current,controller=new AbortController();active.current?.abort();active.current=controller;
  setCity(area);setBusy(true);setError('');setResults(null);setSelected(null);setFilter('menu');setLimit(5);
  try{
   let input:RestaurantSearch={menu:query,area,radius:20000};
   let label=area;
   if(byLocation){
    if(!navigator.geolocation)throw new Error('위치를 확인할 수 없어요. 시 이름으로 검색해 주세요.');
    const position=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,()=>reject(new Error('위치 권한을 허용하거나 아래에서 시 이름으로 검색해 주세요.')),{enableHighAccuracy:false,timeout:10000,maximumAge:60000}));
    if(token!==version.current)return;
    input={menu:query,latitude:Math.round(position.coords.latitude*1000)/1000,longitude:Math.round(position.coords.longitude*1000)/1000,radius:20000};
    label='내 위치 반경 20km · 가까운 순';
   }
   const response=await fetch('/api/nearby-restaurants',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:controller.signal});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'식당을 불러오지 못했어요.');
   if(token===version.current)setResults({places:data.places,city:label,partial:!!data.partial});
  }catch(e){if(token===version.current&&!controller.signal.aborted)setError(e instanceof Error?e.message:'식당을 찾지 못했어요.');}
  finally{if(token===version.current)setBusy(false);}
 }
 const filtered=results?.places.filter(p=>filter==='all'||p.match===filter)??[];
 return <div className="nearby-restaurants">
  {!embedded&&<button type="button" className="nearby-toggle" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}>내 주변 식당 찾기<span aria-hidden="true">{open?'−':'+'}</span></button>}
  {(embedded||open)&&<div className="nearby-body" id={id}>
   <div className="nearby-heading"><span className="nearby-eyebrow">밖에서 먹는 한 끼</span><strong>내 주변 20km에서 골라보세요</strong><p className="nearby-intro">추천 메뉴와 관련된 식당을 먼저 보여줘요. 내 위치 검색은 반경 20km 안에서 가까운 순으로 정렬해요. 식당을 누르면 지도에서 위치를 확인할 수 있어요.</p></div>
   <div className="nearby-location"><button type="button" disabled={busy} onClick={()=>void search('',true)}>동의하고 내 주변 20km 식당 찾기</button></div>
   <p className="nearby-match-note">검색할 때 대략적인 위치와 메뉴를 카카오에 전달해요. 위치는 저장하지 않아요. 지도는 선택한 식당 위치를 네이버에 전달해 표시해요. <a href="/privacy#nearby-location">위치정보 처리 안내 ↗</a></p>
   <details className="nearby-city-fallback"><summary>위치 없이 시 이름으로 찾기</summary>
   <form className="nearby-area" onSubmit={e=>{e.preventDefault();void search();}}><label htmlFor={`${id}-city`}>시 이름</label><div><input id={`${id}-city`} placeholder="예: 수원시, 성남시, 서울" value={city} maxLength={60} minLength={2} required disabled={busy} onChange={e=>setCity(e.target.value)}/><button type="submit" disabled={busy||city.trim().length<2}>식당 찾기</button></div></form>
   <div className="nearby-city-options" role="group" aria-label="시 빠른 선택">{['서울','부산','인천','수원시','성남시'].map(value=><button key={value} type="button" disabled={busy} aria-pressed={results?.city===value} onClick={()=>void search(value)}>{value}</button>)}</div>
   <p className="nearby-match-note">시 이름 검색은 반경 20km 조건이 적용되지 않으며 거리순이 아니에요.</p></details>
   {busy&&<p role="status">위치를 확인하고 식당 목록을 찾고 있어요…</p>}{error&&<p className="nearby-error" role="alert">{error}</p>}
   {results&&<>
    <p className="nearby-results-label" role="status">{results.city} · 검색된 식당 {results.places.length}곳</p>
    <div className="nearby-match-tabs" role="group" aria-label="식당 추천 범위">{([['menu','메뉴 검색'],['similar','비슷한 음식'],['all','식당 목록']] as const).map(([value,label])=><button key={value} type="button" aria-pressed={filter===value} onClick={()=>{setFilter(value);setLimit(5);setSelected(null);}}>{label} <span>{results.places.filter(p=>value==='all'||p.match===value).length}</span></button>)}</div>
    <p className="nearby-match-note">추천 메뉴: {query} · {filter==='all'?'전체 식당을 보여줘요.':filter==='menu'?'이 메뉴로 검색된 식당을 보여줘요.':'비슷한 음식으로 검색된 식당을 보여줘요.'} 메뉴 관련 표시는 검색 연관성이며 판매 확인은 아니에요.</p>
    {results.partial&&<p role="status">일부 검색이 지연되어 확인된 식당만 보여드려요.</p>}
    {filtered.length?<ul className="nearby-list">{filtered.slice(0,limit).map((p,index)=><li key={p.id} className={selected===p.id?'is-selected':undefined}>
     <button type="button" className="nearby-place-select" aria-expanded={selected===p.id} aria-controls={`${id}-map-${p.id}`} onClick={()=>setSelected(selected===p.id?null:p.id)}><span><strong><span className="nearby-number">{index+1}</span>{p.name}</strong><small>{p.category}{p.distance!==null&&<b className="nearby-distance"> · 내 위치에서 {p.distance<1000?`${Math.round(p.distance)}m`:`${(p.distance/1000).toFixed(1)}km`}</b>}</small><span className="nearby-place-address">{p.address}</span></span><span className="nearby-place-pin">{selected===p.id?'지도 접기':'위치 보기'}<span aria-hidden="true"> {selected===p.id?'−':'⌖'}</span></span></button>
     {p.match!=='nearby'&&<span className={`nearby-match-badge ${p.match}`}>{p.match==='menu'?'메뉴 검색':'비슷한 음식'} · {p.keyword}</span>}
     {selected===p.id&&<div id={`${id}-map-${p.id}`} className="nearby-selected-map"><strong>{p.name} 위치</strong>{p.position?<RestaurantMap origin={null} places={selectedPlaces} onSelect={selectRestaurant}/>:<p>지도 좌표가 없어요. 아래 식당 정보에서 위치를 확인해 주세요.</p>}<div className="nearby-links"><a href={p.url} target="_blank" rel="noopener noreferrer">식당 정보·길찾기 ↗</a>{p.phone&&<a href={`tel:${p.phone.replace(/[^\d+]/g,'')}`}>전화</a>}</div><RestaurantContent name={p.name} address={p.address}/></div>}
    </li>)}</ul>:<p>{filter==='all'?'이 범위에서 식당을 찾지 못했어요. 시 이름으로도 검색해 보세요.':filter==='menu'?'이 메뉴로 검색된 식당이 없어요. 비슷한 음식 탭에서 다른 후보를 확인해 보세요.':'비슷한 음식으로 검색된 식당이 없어요. 식당 목록 탭에서 주변 식당을 확인해 보세요.'}</p>}
    {filtered.length>limit&&<button className="nearby-more" type="button" onClick={()=>setLimit(n=>n+5)}>식당 더 보기 · {filtered.length-limit}곳 남음</button>}
    <small className="nearby-source">장소 정보 · 카카오맵 / 지도 · 네이버. 검색 가능한 일부 식당을 보여줘요. 메뉴·가격·영업 여부는 방문 전 확인해 주세요.</small>
   </>}
  </div>}
 </div>;
}
