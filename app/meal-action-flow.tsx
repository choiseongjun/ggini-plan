'use client';
import {useId,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {RiceBuddy} from './rice-buddy';
import './meal-action-flow.css';

function MealActionIcon({kind}:{kind:string}){
 return <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==='cook'?<><path d="M8 24h29c-1 11-7 16-15 16S9 35 8 24Z" fill="#e2b97e"/><path d="m37 27 7-5M15 17c-4-5 4-6 0-11m9 11c-4-5 4-6 0-11m9 11c-4-5 4-6 0-11"/><path d="M18 30q4 5 8 0"/></>:kind==='outside'?<><path d="M9 20h30v22H9z" fill="#f1d9b5"/><path d="M6 12h36l-3 10q-4 4-8 0-3 4-7 0-4 4-8 0-4 4-7 0Z" fill="#b7cf9b"/><path d="M8 12 12 5h24l4 7M21 42V30h10v12M14 29h2"/></>:<><rect x="7" y="8" width="25" height="29" rx="6" fill="#f1dfb3" transform="rotate(-9 7 8)"/><rect x="17" y="13" width="25" height="29" rx="6" fill="#dbe6c8"/><path d="M23 23h12l-3-3m3 3-3 3M35 33H23l3-3m-3 3 3 3"/></>}</svg>;
}

export function MealActionFlow({recipe,outside,alternatives,onBrowse,onRecord,disabled}:{recipe:ReactNode;outside:ReactNode;alternatives:ReactNode;onBrowse:()=>void;onRecord:()=>void;disabled:boolean}){
 const [mode,setMode]=useState<'cook'|'outside'|'swap'>('cook');
 const [expanded,setExpanded]=useState(false);
 const id=useId();
 const choices=[['cook','🍳','직접 요리'],['outside','🍽️','밖에서 먹기'],['swap','↔','다른 메뉴']] as const;
 return <section className="meal-action-flow" aria-label="한 끼 먹는 방법"><div className="meal-action-heading"><div><span>오늘의 한 끼</span><h4>어떻게 먹고 싶어요?</h4></div><RiceBuddy stage={1}/></div><div className="meal-action-modes">{choices.map(([value,,label])=><button type="button" key={value} aria-pressed={mode===value} onClick={()=>{setMode(value);setExpanded(value==='outside');}}><span className="meal-action-icon"><MealActionIcon kind={value}/></span><strong>{label}</strong><span className="meal-action-selected" aria-hidden="true">{mode===value?'✓':''}</span></button>)}</div><button type="button" className="meal-action-main" aria-expanded={expanded} aria-controls={id} onClick={()=>setExpanded(!expanded)}>{expanded?'선택한 방법 접기':mode==='cook'?'재료와 만드는 방법 보기':mode==='outside'?'근처에서 이 메뉴 찾기':'비슷한 메뉴 골라보기'} <span aria-hidden="true">{expanded?'−':'→'}</span></button><div className="meal-action-content" id={id} hidden={!expanded}>{expanded&&(mode==='cook'?recipe:mode==='outside'?<>{outside}<Link className="meal-action-link" href="/convenience">편의점 한 끼로 바꾸기 →</Link></>:<>{alternatives}<button type="button" className="meal-action-link" disabled={disabled} onClick={onBrowse}>메뉴 직접 검색하기 →</button></>)}</div><div className="meal-action-record"><div><strong>이미 드셨나요?</strong><small>추천과 다르게 먹어도 괜찮아요.</small></div><button type="button" onClick={onRecord}>기록하기 ↗</button></div></section>;
}

