'use client';
import {Children,cloneElement,createContext,isValidElement,useContext,type ReactNode,type ReactElement} from 'react';
import {twMoney,taipeiToday} from '../lib/taiwan-plan';
import {emptyDashboard} from '../lib/dashboard';
import translations from '../data/planner-zh-TW.json';

export const PlannerLocale=createContext<'KR'|'TW'>('KR');
const entries=Object.entries(translations).sort((a,b)=>b[0].length-a[0].length);
const pattern=new RegExp(entries.map(([key])=>key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
export function translatePlanner(text:string){
 if(!/[가-힣]/.test(text))return text;
 // Text is translated while creating React elements, never by mutating the DOM.
 // Match the longest phrase once so a translated phrase cannot be translated again.
 return text.replace(pattern,key=>(translations as Record<string,string>)[key]);
}
function createPlannerLocale(market:'KR'|'TW'){
 const isTaiwan=market==='TW';
 const path=(value:string)=>isTaiwan&&value.startsWith('/')&&!value.startsWith('/tw')?'/tw'+(value==='/'?'':value):value;
 const text=(value:string)=>isTaiwan?translatePlanner(value):value;
 function render(node:ReactNode):ReactNode{
  if(!isTaiwan)return node;
  if(typeof node==='string')return text(node);
  if(Array.isArray(node))return Children.map(node,render);
  if(!isValidElement(node))return node;
  const element=node as ReactElement<Record<string,unknown>>;
  const props:Record<string,unknown>={};
  for(const key of ['aria-label','title','placeholder'])if(typeof element.props[key]==='string')props[key]=text(element.props[key]);
  if(element.props.lang!=='ko'&&typeof element.props.href==='string')props.href=path(element.props.href);
  if(element.props.children!==undefined)props.children=render(element.props.children as ReactNode);
  return cloneElement(element,props);
 }
 return {market,isTaiwan,path,text,render,money:isTaiwan?twMoney:(n:number)=>`${Math.round(n).toLocaleString('ko-KR')}원`,today:isTaiwan?taipeiToday:()=>emptyDashboard().today,storageSuffix:isTaiwan?'-TW':'',search:(name:string)=>isTaiwan?`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(name)}`:`https://search.shopping.naver.com/search/all?query=${encodeURIComponent(name)}`};
}

const plannerLocales={KR:createPlannerLocale('KR'),TW:createPlannerLocale('TW')};
export function usePlannerLocale(){return plannerLocales[useContext(PlannerLocale)];}
