'use client';
import {Children,cloneElement,isValidElement,type ReactNode,type ReactElement,useEffect} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {appLanguage,languagePath,withoutLanguage} from '../lib/app-language';
import {uiTranslations} from '../lib/ui-translations';

export function Localize({children}:{children:ReactNode}){
 const language=appLanguage(usePathname());
 if(language==='ko')return children;
 const text=(value:string)=>uiTranslations[value.trim()]?.[language]??value;
 function render(node:ReactNode):ReactNode{
  if(typeof node==='string')return text(node);
  if(Array.isArray(node))return Children.map(node,render);
  if(!isValidElement(node))return node;
  const element=node as ReactElement<Record<string,unknown>>,props:Record<string,unknown>={};
  for(const key of ['aria-label','title','placeholder','label'])if(typeof element.props[key]==='string')props[key]=text(element.props[key]);
  if(typeof element.props.href==='string')props.href=languagePath(element.props.href,language);
  if(element.props.children!==undefined)props.children=render(element.props.children as ReactNode);
  return cloneElement(element,props);
 }
 return render(children);
}
export function LanguageSwitcher(){
 const pathname=usePathname(),language=appLanguage(pathname);
 useEffect(()=>{document.documentElement.lang=language;try{localStorage.setItem('ggini-language',language);}catch{}},[language]);
 return <nav aria-label="Language" style={{display:'flex',gap:'var(--space-3)',alignItems:'center',fontSize:'var(--fs-xs)'}}>{([['ko','한국어'],['en','English'],['ja','日本語']] as const).map(([key,label])=><Link key={key} href={languagePath(withoutLanguage(pathname),key)} hrefLang={key} aria-current={key===language?'page':undefined} style={{minHeight:'var(--touch)',display:'inline-flex',alignItems:'center',fontWeight:key===language?700:400,color:'var(--text-muted)'}}>{label}</Link>)}</nav>;
}
