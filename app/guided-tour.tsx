'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {usePathname,useRouter} from 'next/navigation';
import './guided-tour.css';
const key='kkini-guided-tour';
const steps=[
 {path:'/',target:'.home-start-cta, .planner-adopt .primary-button, .shopping-planner',title:'여기서 식단을 추천받아요',text:'홈의 추천 버튼으로 시작해요. 취향·못 먹는 재료 설정에서 조건을 바꿀 수 있어요.'},
 {path:'/record',target:'.record-entry-actions button:first-child',title:'사진으로 기록하고 싶다면',text:'이 버튼을 누르고 로그인한 뒤 음식 이름을 골라요. 사진을 올리면 먹은 양을 분석해 저장해요.'},
 {path:'/record',target:'.record-entry-actions button:last-child',title:'사진 없이도 남길 수 있어요',text:'음식을 검색하고 먹은 양을 선택하면 끝! 추천이나 구매 등록은 필요 없어요. 지난 기록도 이 기록 탭에서 날짜별로 봐요.'},
 {path:'/profile',target:'.profile-quick-settings button',title:'내 정보는 여기서 바꿔요',text:'키·체중·활동량과 식사 취향을 설정해요. 처음부터 모두 입력하지 않아도 괜찮아요.'},
 {path:'/profile',target:'.buddy-pet',title:'끼니에게 인사해 보세요',text:'캐릭터를 톡 누르면 반응해요. 식사를 기록한 날마다 성장하고 선물을 받아요. 하루 쉬어도 성장은 사라지지 않아요.'},
];
function savedStep(){try{const v=JSON.parse(sessionStorage.getItem(key)??'null');return v&&Number.isInteger(v.step)&&v.step>=0&&v.step<steps.length&&Date.now()-v.at<1800000?v.step:null;}catch{return null;}}
export function GuidedTour(){
 const pathname=usePathname(),router=useRouter();
 const [index,setIndex]=useState<number|null>(null);
 const [rect,setRect]=useState<{left:number;top:number;width:number;height:number}|null>(null);
 const panel=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);
  const start=params.get('guide')==='start';
  const next=start?0:savedStep();
  if(start){try{sessionStorage.setItem(key,JSON.stringify({step:0,at:Date.now()}));}catch{}params.delete('guide');window.history.replaceState(null,'',window.location.pathname+(params.size?'?'+params.toString():''));}
  const frame=requestAnimationFrame(()=>setIndex(next));return()=>cancelAnimationFrame(frame);
 },[pathname]);
 useEffect(()=>{
  if(index===null)return;
  try{sessionStorage.setItem(key,JSON.stringify({step:index,at:Date.now()}));}catch{}
  const step=steps[index];if(pathname!==step.path){router.push(step.path);return;}
  let target:Element|null=null;
  const measure=()=>{const el=step.target.split(',').map(selector=>document.querySelector(selector.trim())).find(Boolean);if(!el){setRect(null);return;}if(target!==el){target=el;el.scrollIntoView({block:'center',behavior:'instant'});}const r=el.getBoundingClientRect();setRect({left:r.left,top:r.top,width:r.width,height:r.height});};
  const frame=requestAnimationFrame(()=>{measure();panel.current?.focus();});
  const observer=new MutationObserver(measure);observer.observe(document.querySelector('.app-side')??document.body,{childList:true,subtree:true});
  window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);};
 },[index,pathname,router]);
 const close=()=>{try{sessionStorage.removeItem(key);}catch{}setIndex(null);};
 if(index===null)return null;
 const step=steps[index];
 return createPortal(<div className="guided-tour-layer">
  {rect&&<div className="guided-tour-spot" style={{left:rect.left-6,top:rect.top-6,width:rect.width+12,height:rect.height+12}}/>}
  <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="guided-tour-title" className={`guided-tour-panel${rect&&rect.top>window.innerHeight*0.55?' is-top':''}`} onKeyDown={e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const buttons=panel.current?.querySelectorAll<HTMLButtonElement>('button');if(!buttons?.length)return;const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}}>
   <header><span>끼니플랜 따라 해보기 · {index+1}/{steps.length}</span><button type="button" onClick={close}>그만 보기</button></header>
   <h2 id="guided-tour-title">{step.title}</h2><p>{step.text}</p><small>지금은 버튼 위치를 둘러보는 중이에요. 기록이나 설정은 바뀌지 않아요.</small>
   <footer>{index>0&&<button type="button" onClick={()=>{setRect(null);setIndex(index-1);}}>이전</button>}<button type="button" className="tour-next" onClick={()=>{if(index===steps.length-1)close();else{setRect(null);setIndex(index+1);}}}>{index===steps.length-1?'이제 시작하기':'다음'}</button></footer>
  </div>
 </div>,document.body);
}
