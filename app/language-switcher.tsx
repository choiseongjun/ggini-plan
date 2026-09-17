'use client';

import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import './language-switcher.css';

function Flag({market}:{market:'KR'|'TW'}){
 return <svg className="language-flag" viewBox="0 0 30 20" aria-hidden="true">
  {market==='TW'?<><path fill="#ee2637" d="M0 0h30v20H0z"/><path fill="#153b92" d="M0 0h15v10H0z"/><g transform="translate(7.5 5)" fill="#fff">{Array.from({length:12},(_,i)=><path key={i} d="M-.55-1.8 0-4 .55-1.8Z" transform={`rotate(${i*30})`}/>)}<circle r="2.1" stroke="#153b92" strokeWidth=".5"/></g></>:<><path fill="#fff" d="M0 0h30v20H0z"/><g transform="translate(15 10) rotate(32)"><circle r="5" fill="#cd2e3a"/><path d="M-5 0a5 5 0 0 0 10 0 2.5 2.5 0 0 0-5 0 2.5 2.5 0 0 1-5 0" fill="#0047a0"/></g><g stroke="#20282c" strokeWidth=".85">{[-1,0,1].map(n=><g key={n}><path d={`M${5+n} ${3-n}l3 3M${22+n} ${14-n}l3 3M${5+n} ${17+n}l3-3M${22+n} ${6+n}l3-3`}/></g>)}</g><g stroke="white" strokeWidth=".75"><path d="m23 15 2-2M6 15l1 1M23 5l1-1"/></g></>}
 </svg>;
}

export function LanguageSwitcher({market}:{market:'KR'|'TW'}){
 const [open,setOpen]=useState(false);
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const pathname=usePathname();
 const suffix=pathname.replace(/^\/tw(?=\/|$)/,'')||'/';
 const route=['/','/cart','/record','/profile'].includes(suffix)?suffix:'/';
 useEffect(()=>{
  if(!open)return;
  const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus();}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[open]);
 return <div className="language-switcher" ref={root} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}>
  <button className="language-trigger" ref={trigger} type="button" aria-label={market==='KR'?'국가·언어 변경':'切換國家與語言'} aria-expanded={open} aria-controls="language-options" onClick={()=>setOpen(v=>!v)}>
   <Flag market={market}/><span>{market==='KR'?'한국어':'繁體中文'}</span><svg className="language-chevron" viewBox="0 0 12 12" aria-hidden="true"><path d="m3 4.5 3 3 3-3"/></svg>
  </button>
  {open&&<nav id="language-options" className="language-options" aria-label={market==='KR'?'국가·언어':'國家與語言'}>
   <p>{market==='KR'?'국가·언어':'國家與語言'}</p>
   {([{id:'KR',name:'한국어',detail:'대한민국 · KRW',lang:'ko',href:route},{id:'TW',name:'繁體中文',detail:'台灣 · TWD',lang:'zh-TW',href:'/tw'+(route==='/'?'':route)}] as const).map(option=><Link key={option.id} href={option.href} lang={option.lang} hrefLang={option.lang} className={market===option.id?'is-selected':undefined} aria-current={market===option.id?'true':undefined} onClick={()=>setOpen(false)}><Flag market={option.id}/><span><strong>{option.name}</strong><small>{option.detail}</small></span>{market===option.id&&<span className="language-check" aria-hidden="true">✓</span>}</Link>)}
  </nav>}
 </div>;
}
