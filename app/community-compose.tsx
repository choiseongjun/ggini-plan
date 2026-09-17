'use client';
import {useState} from 'react';
import {Checkbox} from './components/checkbox';
import {ProductThumb} from './product-thumb';
import {dietStyles} from '../lib/meal-plan';
import type {CatalogItem} from '../lib/catalog';
import './community-compose.css';

export function CommunityCompose({products,alias,onAlias,busy,onShare,onClose}:{products:CatalogItem[];alias:string;onAlias:(value:string)=>void;busy:boolean;onShare:(payload:Record<string,unknown>)=>Promise<boolean>;onClose:()=>void}){
 const [selected,setSelected]=useState<string[]>([]),[query,setQuery]=useState(''),[shown,setShown]=useState(12);
 const [body,setBody]=useState(''),[title,setTitle]=useState('나의 장보기'),[style,setStyle]=useState('balanced');
 const chosen=products.filter(p=>selected.includes(p.id));
 const matches=query.trim()?products.filter(p=>`${p.name} ${p.detail}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())):[];
 function toggle(id:string){setSelected(previous=>previous.includes(id)?previous.filter(x=>x!==id):previous.length<20?[...previous,id]:previous);}
 return <form className="community-compose simple-compose" onSubmit={async e=>{e.preventDefault();await onShare({action:'share',alias,title:title.trim()||'나의 장보기',body,style,items:chosen.map(p=>p.id)});}}>
  <header><div><span>🧺 나의 장보기</span><h3>잘 산 것, 함께 나눠요</h3></div><button type="button" className="text-link" disabled={busy} onClick={onClose}>닫기</button></header>
  <fieldset disabled={busy}>
   <section className="compose-selection"><div className="compose-selection-heading"><strong>공유할 상품</strong><span>{chosen.length}/20종</span></div>
    {chosen.length>0?<ul className="compose-chosen">{chosen.map(p=><li key={p.id}><ProductThumb item={p}/><div className="compose-product-info">{p.productUrl?<a href={p.productUrl} target="_blank" rel="noopener noreferrer">{p.name} ↗</a>:<strong>{p.name}</strong>}<small>{p.detail}</small><strong>{p.price.toLocaleString('ko-KR')}원</strong></div><button type="button" onClick={()=>toggle(p.id)} aria-label={`${p.name} 선택 해제`}>×</button></li>)}</ul>:<p className="compose-hint">공유하고 싶은 상품을 검색해서 골라 주세요.</p>}
    <label className="compose-search">상품 검색<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setShown(12);}} placeholder="예: 두부, 볶음밥"/></label>
    {query.trim()&&<div className="compose-search-results"><p role="status">{matches.length?`${matches.length}종 검색됨`:'검색된 상품이 없어요.'}{chosen.length===20?' · 최대 20종까지 선택할 수 있어요.':''}</p><div className="community-products">{matches.slice(0,shown).map(p=><label key={p.id}><Checkbox aria-label={`${p.name} 선택`} checked={selected.includes(p.id)} disabled={!selected.includes(p.id)&&selected.length>=20} onChange={()=>toggle(p.id)}/><ProductThumb item={p}/><span className="compose-product-info"><strong>{p.name}</strong><small>{p.detail}</small><strong>{p.price.toLocaleString('ko-KR')}원</strong></span></label>)}</div>{matches.length>shown&&<button type="button" className="text-link" onClick={()=>setShown(n=>n+12)}>상품 더 보기</button>}</div>}
   </section>
   <label>한 줄 후기<textarea required maxLength={1000} value={body} onChange={e=>setBody(e.target.value)} placeholder="어떻게 먹었는지, 뭐가 좋았는지 알려 주세요."/></label>
   <label>공개 별명<input required maxLength={24} value={alias} onChange={e=>onAlias(e.target.value)} placeholder="이웃에게 보여줄 이름" autoComplete="nickname"/></label>
   <details className="compose-options"><summary>제목·식단 스타일 변경</summary><label>제목<input maxLength={80} value={title} onChange={e=>setTitle(e.target.value)} placeholder="나의 장보기"/></label><label>식단 스타일<select value={style} onChange={e=>setStyle(e.target.value)}>{Object.entries(dietStyles).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label></details>
   <p className="compose-hint">선택한 상품·별명·후기가 함께 메뉴에 공개돼요.</p>
   <button className="primary-button" disabled={!chosen.length||!alias.trim()||!body.trim()}>{busy?'공유하는 중…':chosen.length?`선택한 ${chosen.length}종 공유하기`:'상품을 선택해 주세요'}</button>
  </fieldset>
 </form>;
}
