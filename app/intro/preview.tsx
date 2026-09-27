'use client';
import Link from 'next/link';
import {useState} from 'react';
import {trackAnalytics} from '../../lib/analytics';

export function IntroStart({small=false}:{small?:boolean}){
 return <Link className={`intro-start${small?' is-small':''}`} href="/" onClick={()=>trackAnalytics('landing_cta_clicked')}>{small?'시작하기':'무료로 식단 추천받기'} <span aria-hidden="true">↗</span></Link>;
}
const choices=[{name:'두부조림',reason:'같은 두부, 다른 조리법',icon:'🍲'},{name:'달걀찜',reason:'부담 없이 간편하게',icon:'🥚'},{name:'닭고기 채소볶음',reason:'다른 재료로 바꿔보기',icon:'🥦'}];
export function IntroDemo(){
 const [menu,setMenu]=useState('두부구이');
 const [open,setOpen]=useState(false);
 return <div className="intro-demo"><div className="intro-week-top"><strong>오늘의 저녁</strong><span>기능 체험 · 예시 메뉴</span></div><div className="intro-demo-current"><span aria-hidden="true">{choices.find(c=>c.name===menu)?.icon??'🍚'}</span><div><small>오늘은 이 메뉴 어때요?</small><strong aria-live="polite">{menu}</strong></div></div><button className="intro-demo-toggle" type="button" aria-expanded={open} onClick={()=>setOpen(!open)}>↔ {open?'후보 접기':'비슷한 메뉴로 바꾸기'}</button>{open&&<div className="intro-demo-choices">{choices.filter(c=>c.name!==menu).map(c=><button key={c.name} type="button" onClick={()=>{setMenu(c.name);setOpen(false);}}><span aria-hidden="true">{c.icon}</span><span><strong>{c.name}</strong><small>{menu==='두부구이'?c.reason:'다른 메뉴 예시'}</small></span><span aria-hidden="true">→</span></button>)}</div>}<p className="intro-demo-note">{menu==='두부구이'?'눌러보고, 마음에 드는 메뉴를 골라보세요.':'이 끼니만 바뀌었어요. 나머지 식단은 그대로!'}<br/><small>체험 내용은 저장되지 않아요. 실제 후보는 설정에 따라 달라져요.</small></p></div>;
}
