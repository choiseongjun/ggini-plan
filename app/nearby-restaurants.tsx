'use client';
import {useCallback,useEffect,useId,useMemo,useRef,useState} from 'react';
import {restaurantKeywords,type RestaurantMatch} from '../lib/restaurant-discovery';
import {RestaurantMap} from './restaurant-map';
import {RestaurantContent} from './restaurant-content';
import './nearby-restaurants.css';

type Results={places:RestaurantMatch[];city:string;partial:boolean};
export function NearbyRestaurants({menu,embedded=false}:{menu:string;embedded?:boolean}){
 const id=useId();
 const [open,setOpen]=useState(false),[city,setCity]=useState('');
 const [filter,setFilter]=useState<'all'|'menu'|'similar'>('all'),[limit,setLimit]=useState(5);
 const [selected,setSelected]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [results,setResults]=useState<Results|null>(null);
 const active=useRef<AbortController|null>(null),version=useRef(0);
 const query=restaurantKeywords(menu)[0];
 const selectedPlaces=useMemo(()=>results?.places.filter(p=>p.id===selected)??[],[results,selected]);
 const selectRestaurant=useCallback((placeId:string)=>setSelected(placeId),[]);
 useEffect(()=>()=>{version.current++;active.current?.abort();},[]);
 useEffect(()=>{if(selected)document.getElementById(`${id}-map-${selected}`)?.scrollIntoView({behavior:'smooth',block:'nearest'});},[id,selected]);
 async function search(nextCity=city){
  const area=nextCity.trim();if(area.length<2||busy)return;
  const token=++version.current,controller=new AbortController();active.current?.abort();active.current=controller;
  setCity(area);setBusy(true);setError('');setResults(null);setSelected(null);setFilter('all');setLimit(5);
  try{
   const response=await fetch('/api/nearby-restaurants',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({menu:query,area,radius:3000}),signal:controller.signal});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'식당을 불러오지 못했어요.');
   if(token===version.current)setResults({places:data.places,city:area,partial:!!data.partial});
  }catch(e){if(token===version.current&&!controller.signal.aborted)setError(e instanceof Error?e.message:'식당을 찾지 못했어요.');}
  finally{if(token===version.current)setBusy(false);}
 }
 const filtered=results?.places.filter(p=>filter==='all'||p.match===filter)??[];
 return <div className="nearby-restaurants">
  {!embedded&&<button type="button" className="nearby-toggle" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}>지역별 식당 찾기<span aria-hidden="true">{open?'−':'+'}</span></button>}
  {(embedded||open)&&<div className="nearby-body" id={id}>
   <div className="nearby-heading"><span className="nearby-eyebrow">밖에서 먹는 한 끼</span><strong>어느 시에서 먹을까요?</strong><p className="nearby-intro">시 이름으로 식당 목록을 먼저 찾아요. 식당을 누르면 그곳의 지도 위치가 펼쳐져요.</p></div>
   <form className="nearby-area" onSubmit={e=>{e.preventDefault();void search();}}><label htmlFor={`${id}-city`}>시 이름</label><div><input id={`${id}-city`} placeholder="예: 수원시, 성남시, 서울" value={city} maxLength={60} minLength={2} required disabled={busy} onChange={e=>setCity(e.target.value)}/><button type="submit" disabled={busy||city.trim().length<2}>식당 찾기</button></div></form>
   <div className="nearby-city-options" role="group" aria-label="시 빠른 선택">{['서울','부산','인천','수원시','성남시'].map(value=><button key={value} type="button" disabled={busy} aria-pressed={results?.city===value} onClick={()=>void search(value)}>{value}</button>)}</div>
   <p className="nearby-match-note">현재 위치 권한 없이 검색해요. 도시 전체의 검색 결과이며 거리순이 아니에요.</p>
   {busy&&<p role="status">{city} 식당 목록을 찾고 있어요…</p>}{error&&<p className="nearby-error" role="alert">{error}</p>}
   {results&&<>
    <p className="nearby-results-label" role="status">{results.city} · 검색된 식당 {results.places.length}곳</p>
    <div className="nearby-match-tabs" role="group" aria-label="식당 추천 범위">{([['all','식당 목록'],['menu','메뉴 검색'],['similar','비슷한 음식']] as const).map(([value,label])=><button key={value} type="button" aria-pressed={filter===value} onClick={()=>{setFilter(value);setLimit(5);setSelected(null);}}>{label} <span>{results.places.filter(p=>value==='all'||p.match===value).length}</span></button>)}</div>
    <p className="nearby-match-note">추천 메뉴: {query} · 메뉴와 관계없이 식당을 보여줘요. 메뉴 관련 표시는 검색 연관성이며 판매 확인은 아니에요.</p>
    {results.partial&&<p role="status">일부 검색이 지연되어 확인된 식당만 보여드려요.</p>}
    {filtered.length?<ul className="nearby-list">{filtered.slice(0,limit).map((p,index)=><li key={p.id} className={selected===p.id?'is-selected':undefined}>
     <button type="button" className="nearby-place-select" aria-expanded={selected===p.id} aria-controls={`${id}-map-${p.id}`} onClick={()=>setSelected(selected===p.id?null:p.id)}><span><strong><span className="nearby-number">{index+1}</span>{p.name}</strong><small>{p.category}</small><span className="nearby-place-address">{p.address}</span></span><span className="nearby-place-pin">{selected===p.id?'지도 접기':'위치 보기'}<span aria-hidden="true"> {selected===p.id?'−':'⌖'}</span></span></button>
     {p.match!=='nearby'&&<span className={`nearby-match-badge ${p.match}`}>{p.match==='menu'?'메뉴 검색':'비슷한 음식'} · {p.keyword}</span>}
     {selected===p.id&&<div id={`${id}-map-${p.id}`} className="nearby-selected-map"><strong>{p.name} 위치</strong>{p.position?<RestaurantMap origin={null} places={selectedPlaces} onSelect={selectRestaurant}/>:<p>지도 좌표가 없어요. 아래 식당 정보에서 위치를 확인해 주세요.</p>}<div className="nearby-links"><a href={p.url} target="_blank" rel="noopener noreferrer">식당 정보·길찾기 ↗</a>{p.phone&&<a href={`tel:${p.phone.replace(/[^\d+]/g,'')}`}>전화</a>}</div><RestaurantContent name={p.name} address={p.address}/></div>}
    </li>)}</ul>:<p>{filter==='all'?'이 지역에서 식당을 찾지 못했어요. 시 이름을 확인해 주세요.':'메뉴 관련 결과가 없어요. 식당 목록 탭에서 다른 식당을 골라보세요.'}</p>}
    {filtered.length>limit&&<button className="nearby-more" type="button" onClick={()=>setLimit(n=>n+5)}>식당 더 보기 · {filtered.length-limit}곳 남음</button>}
    <small className="nearby-source">장소 정보 · 카카오맵 / 지도 · 네이버. 검색 가능한 일부 식당을 보여줘요. 메뉴·가격·영업 여부는 방문 전 확인해 주세요.</small>
   </>}
  </div>}
 </div>;
}
