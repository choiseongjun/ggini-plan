'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {isPantrySeasoning,pantryShortage} from '../lib/pantry-recommendation';
import type {PlanProduct} from '../lib/shopping-plan';
import {PantryMenuDetails} from './pantry-menu-details';
import {Icon} from './app-shell';

type Props={owned:string[];favorites:string[];recent:string[];priority:string[];simple:boolean;allowShopping:boolean;onShoppingChange:(value:boolean)=>void;onSelect:(p:PlanProduct)=>void};
export function PantryDiscovery(props:Props){
 const [query,setQuery]=useState(''),[open,setOpen]=useState(true);
 const [search,setSearch]=useState('');
 useEffect(()=>{const timer=setTimeout(()=>setSearch(query.trim()),250);return()=>clearTimeout(timer);},[query]);
 const panelId=useId(),toggleRef=useRef<HTMLButtonElement>(null);
 function collapse(){setOpen(false);toggleRef.current?.focus({preventScroll:true});toggleRef.current?.scrollIntoView({block:'nearest'});}
 return <section className="pantry-discovery pantry-menu-browser"><h2 className="pantry-browser-heading"><button ref={toggleRef} type="button" className="pantry-browser-toggle" aria-expanded={open} aria-controls={panelId} onClick={()=>setOpen(v=>!v)}><span className="pantry-browser-title"><span className="pantry-browser-eyebrow">오늘의 한 끼</span><span>오늘 먹을 메뉴 찾기</span></span><span className="pantry-browser-toggle-label">{open?'접기':'펼치기'}<Icon name="chevron" size={18}/></span></button></h2><p className="pantry-browser-caption">{open?'먼저 몇 가지 살펴보고, 마음에 드는 메뉴를 골라보세요.':'메뉴 목록을 접어두었어요. 펼치면 이어서 볼 수 있어요.'}</p><div id={panelId} hidden={!open} className="pantry-browser-body">
 <label className="pantry-search-label" htmlFor={`${panelId}-search`}>먹고 싶은 메뉴나 재료가 있나요?</label><div className="pantry-search-field"><input id={`${panelId}-search`} className="pantry-menu-search" type="search" aria-label="메뉴 또는 재료 검색" placeholder="메뉴나 재료 검색 · 계란, 두부…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" onClick={()=>setQuery('')} aria-label="검색어 지우기">지우기</button>}</div><div className="pantry-search-suggestions" aria-label="빠른 메뉴 검색">{['볶음밥','국수','두부','달걀'].map(word=><button type="button" key={word} aria-pressed={query===word} onClick={()=>setQuery(query===word?'':word)}>{word}</button>)}</div>
 {props.owned.some(n=>!isPantrySeasoning(n))&&<label className="pantry-shopping-toggle"><input type="checkbox" checked={props.allowShopping} onChange={e=>props.onShoppingChange(e.target.checked)}/><span className="pantry-shopping-check"><Icon name="check" size={15}/></span><span className="pantry-shopping-copy"><strong>재료를 조금 더 사도 괜찮아요</strong><small>더 살 재료가 적은 순으로 보여드려요.</small></span></label>}
 <MenuResults key={JSON.stringify([props.owned,props.allowShopping,search])} {...props} query={search} onClear={()=>setQuery('')}/><button type="button" className="pantry-browser-collapse" onClick={collapse}>메뉴 목록 접기 <Icon name="chevron" size={16}/></button></div></section>;
}
function MenuResults({owned,allowShopping,onSelect,query,onClear}:Props&{query:string;onClear:()=>void}){
 const sectionId=useId(),[expanded,setExpanded]=useState<string|null>(null);
 const [shown,setShown]=useState(query?12:6);
 const [offset,setOffset]=useState(0),[retry,setRetry]=useState(0);
 const [state,setState]=useState<{products:PlanProduct[];total:number;loaded:number;error:string}>({products:[],total:0,loaded:-1,error:''});
 const hasPantry=owned.some(n=>!isPantrySeasoning(n));
 const body=JSON.stringify({action:'browse',pantry:owned,pantryAllowShopping:!hasPantry||allowShopping,query,offset});
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/shopping-plan/engine',{method:'POST',headers:{'Content-Type':'application/json'},body,signal:controller.signal}).then(async r=>{
   const data=await r.json();if(!r.ok)throw new Error(data.error??'메뉴를 불러오지 못했어요.');
   if(!controller.signal.aborted)setState(previous=>({products:offset===0?data.products:[...previous.products,...data.products.filter((p:PlanProduct)=>!previous.products.some(v=>v.id===p.id))],total:data.total,loaded:offset,error:''}));
  }).catch(e=>{if(!controller.signal.aborted)setState(previous=>({...previous,error:e.message}));});
  return()=>controller.abort();
 },[body,offset,retry]);
 const loading=state.loaded!==offset&&!state.error;
 return <>
 {state.loaded>=0&&<p className="pantry-browser-count" role="status"><span>{query?`‘${query}’ 검색 결과`:'둘러볼 수 있는 메뉴'} <strong>{state.total.toLocaleString()}</strong></span><span>{Math.min(shown,state.products.length)}개 표시</span></p>}
 <div className="pantry-discovery-grid">{state.products.slice(0,shown).map(p=>{
  const missing=pantryShortage(p,owned),main=pantryShortage(p,[]).main,open=expanded===p.id,panelId=`${sectionId}-${p.id}`;
  return <article key={p.id} className={`pantry-discovery-card${open?' is-expanded':''}`}><button className="pantry-discovery-card-toggle" aria-expanded={open} aria-controls={panelId} onClick={()=>setExpanded(open?null:p.id)}><span><strong>{p.name}</strong><small>{!hasPantry?`주재료: ${main.slice(0,4).join(' · ')}${main.length>4?' 외':''}`:missing.main.length?`더 필요해요: ${missing.main.slice(0,3).join(' · ')}${missing.main.length>3?` 외 ${missing.main.length-3}가지`:''}`:missing.seasonings.length?'주재료 있어요 · 양념 확인':'재료 있어요 · 분량 확인'}</small></span><Icon name="chevron" size={18}/></button><div id={panelId} hidden={!open}>{open&&<PantryMenuDetails product={p} owned={owned} onClose={()=>setExpanded(null)} onSelect={()=>onSelect(p)}/>}</div></article>;
 })}</div>
 {loading&&<p role="status">메뉴를 불러오고 있어요…</p>}
 {state.error&&<div role="alert"><p>{state.error}</p><button onClick={()=>{setState(s=>({...s,error:''}));setRetry(n=>n+1);}}>다시 시도</button></div>}
 {!loading&&!state.error&&state.total===0&&<div className="pantry-search-empty" role="status"><strong>맞는 메뉴를 찾지 못했어요</strong><p>재료 하나로 검색하거나, 추가 장보기를 허용해 보세요.</p>{query&&<button type="button" onClick={onClear}>검색 지우고 전체 메뉴 보기</button>}</div>}
 {!state.error&&Math.min(shown,state.products.length)<state.total&&<button className="pantry-menu-more" disabled={loading} onClick={()=>{if(shown<state.products.length){setShown(state.products.length);}else{setOffset(state.products.length);setShown(state.products.length+12);}}}>메뉴 더 보기 <Icon name="chevron" size={16}/></button>}
 </>;
}
