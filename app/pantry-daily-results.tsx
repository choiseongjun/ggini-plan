'use client';
import {useState} from 'react';
import {Button} from './components/ui';
import type {PlanProduct} from '../lib/shopping-plan';
import {pantryShortage,pantryCookingStyle} from '../lib/pantry-recommendation';
import {RecipeProductPreview} from './meal-source';
import './pantry-daily-results.css';

export function PantryDailyResults({ids,products,candidateIds,owned,disabled,onChoose,onSave}:{ids:string[];products:PlanProduct[];candidateIds:string[];owned:string[];disabled:boolean;onChoose:(index:number,id:string)=>void;onSave:()=>void}){
 const [selectedSlot,setSelectedSlot]=useState(0);
 const [category,setCategory]=useState('전체');
 const [page,setPage]=useState(0);
 const slots=['아침','점심','저녁'];
 const candidates=candidateIds.flatMap(id=>{const p=products.find(p=>p.id===id);return p?[p]:[];});
 const group=(p:PlanProduct)=>{const style=p.name+pantryCookingStyle(p);return /밥/.test(style)?'밥·덮밥':/면/.test(style)?'면':/국|탕|찌개/.test(style)?'국·찌개':'반찬·기타';};
 const categories=['전체',...new Set(candidates.map(group))];
 const filtered=category==='전체'?candidates:candidates.filter(p=>group(p)===category);
 const pages=Math.max(1,Math.ceil(filtered.length/4));
 const current=Math.min(page,pages-1);
 const selectedProduct=products.find(p=>p.id===ids[selectedSlot]);
 return <section className="pantry-daily-results" data-pantry-daily-results tabIndex={-1} aria-label="오늘의 세 끼 추천"><h2 data-recommended-menu-heading tabIndex={-1}>오늘의 세 끼</h2>
 <div className="pantry-daily-tabs" role="group" aria-label="아침 점심 저녁 선택">{slots.map((slot,i)=><button type="button" key={slot} aria-pressed={selectedSlot===i} aria-controls="pantry-selected-meal" onClick={()=>setSelectedSlot(i)}><span>{slot}</span><small>{products.find(p=>p.id===ids[i])?.name.replaceAll('_',' ')??'메뉴 확인 중'}</small></button>)}</div>
 <article id="pantry-selected-meal" className="pantry-selected-meal" aria-label={`${slots[selectedSlot]} 메뉴`}><small>{slots[selectedSlot]}</small><h3>{selectedProduct?.name.replaceAll('_',' ')??'메뉴 확인 중'}</h3>{selectedProduct&&<details key={selectedProduct.id}><summary>재료·만드는 법</summary><RecipeProductPreview product={selectedProduct}/></details>}</article>
 <p>끼니를 눌러 메뉴를 확인하고, 아래 후보로 바꿔보세요.</p><Button block disabled={disabled} onClick={onSave}>이 식단 저장하기</Button><h3>메뉴 골라 바꾸기</h3><nav className="pantry-category-tabs" aria-label="메뉴 분류">{categories.map(c=><Button key={c} size="sm" variant={category===c?'secondary':'ghost'} aria-pressed={category===c} onClick={()=>{setCategory(c);setPage(0);}}>{c} {c==='전체'?candidates.length:candidates.filter(p=>group(p)===c).length}</Button>)}</nav><div className="pantry-daily-list">{filtered.slice(current*4,current*4+4).map(p=><article key={p.id}>{p.productImageUrl&&<img src={p.productImageUrl} alt="" loading="lazy"/>}<div><h4>{p.name.replaceAll('_',' ')}</h4><small>더 필요한 주재료: {pantryShortage(p,owned).main.join(' · ')||'없음'}</small><div className="pantry-daily-pick">{slots.map((slot,i)=><Button variant="secondary" size="sm" key={slot} disabled={disabled||ids[i]===p.id} onClick={()=>{setSelectedSlot(i);onChoose(i,p.id);}}>{ids[i]===p.id?`${slot} 선택됨`:`${slot}에 담기`}</Button>)}</div><details><summary>상세보기</summary><RecipeProductPreview product={p}/></details></div></article>)}</div>{pages>1&&<nav className="pantry-list-pages" aria-label="메뉴 목록 페이지"><Button variant="ghost" disabled={current===0} onClick={()=>setPage(current-1)}>이전</Button><span aria-live="polite">{current+1} / {pages}</span><Button variant="ghost" disabled={current===pages-1} onClick={()=>setPage(current+1)}>다음</Button></nav>}</section>;
}
