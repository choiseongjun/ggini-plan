'use client';

import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {buddyGrowth,buddyStages} from '../lib/buddy-growth';
import {RiceBuddy} from './rice-buddy';
import './buddy-companion.css';

export function BuddyCompanion({growth,loggedToday,guest,onLogin,userId,recordCount=0,weekStart=''}:{growth?:ReturnType<typeof buddyGrowth>;loggedToday?:boolean;guest:boolean;onLogin:()=>void;userId?:string;recordCount?:number;weekStart?:string}){
 const [reaction,setReaction]=useState<'wave'|'record'|'grow'|null>(null);
 const [chatter,setChatter]=useState(0);
 const [touches,setTouches]=useState(0);
 const [quiet,setQuiet]=useState(false);
 const [awake,setAwake]=useState(false);
 const scene=useRef<HTMLElement>(null);
 const ready=guest||Boolean(growth);
 useEffect(()=>{
  if(!ready)return;
  const node=scene.current;if(!node)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false;
  let tick:ReturnType<typeof setInterval>|undefined;
  const update=()=>{
   if(tick)clearInterval(tick);
   const active=visible&&!document.hidden&&!quiet&&!reduced.matches;
   setAwake(active);
   if(active)tick=setInterval(()=>setChatter(n=>n+1),8000);
  };
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;update();},{threshold:0.15});
  observer.observe(node.querySelector('.buddy-pet')??node);
  document.addEventListener('visibilitychange',update);
  reduced.addEventListener('change',update);
  return()=>{observer.disconnect();if(tick)clearInterval(tick);document.removeEventListener('visibilitychange',update);reduced.removeEventListener('change',update);};
 },[quiet,ready]);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 useEffect(()=>{
  if(guest||!userId||!growth)return;
  const key=`kkini-companion:${userId}`;
  let next:'grow'|'record'|null=null;
  try{
   const old=JSON.parse(sessionStorage.getItem(key)??'null');
   if(old&&typeof old.stage==='number'){
    if(growth.stage>old.stage)next='grow';
    else if(growth.days>old.days||(weekStart===old.weekStart&&recordCount>old.recordCount))next='record';
   }
   sessionStorage.setItem(key,JSON.stringify({stage:growth.stage,days:growth.days,recordCount,weekStart}));
  }catch{/* Storage is optional; tapping still works in private sessions. */}
  if(!next)return;
  const start=setTimeout(()=>{
   if(timer.current)clearTimeout(timer.current);
   setReaction(next);
   timer.current=setTimeout(()=>setReaction(null),3200);
  },0);
  return()=>clearTimeout(start);
 },[guest,userId,growth,recordCount,weekStart]);
 const greet=()=>{if(reaction)return;setTouches(n=>n+1);setReaction('wave');timer.current=setTimeout(()=>setReaction(null),2600);};
 const buddy=guest?buddyGrowth(0):growth;
 if(!buddy)return <section className="buddy-home" id="buddy-companion"><h2>나의 식사 친구, 끼니</h2><p>끼니의 성장 기록을 불러오는 중이에요. 잠시 후에도 보이지 않으면 새로고침해 주세요.</p></section>;
 const littleTalk=[
  !guest&&loggedToday?'오늘 한 끼도 잘 챙겼네. 기록은 내가 기억할게!':buddy.message,
  '나 여기 있어! 스푼도 준비해 뒀지.',
  !guest&&loggedToday?'오늘 먹은 메뉴 중에 뭐가 제일 맛있었어?':'오늘 뭐 먹었어? 한 끼 이야기 들려줘.',
  buddy.next?`${buddy.next.gift}까지 ${buddy.remaining}일! 나한테 잘 어울릴까?`:'우리 벌써 단짝이네. 오늘도 같이 있자.',
  '음… 다음 한 끼는 뭘 먹으면 좋을까?',
  '잠깐 기지개 쭉! 나는 여기서 기다릴게.',
 ];
 const greetings=['헤헤, 불렀어? 스푼 흔들며 인사!', '톡톡! 만나서 반가워. 오늘도 같이 잘 먹자.', '내 새싹 간지러워! 한 번 더 인사할까?'];
 return <section ref={scene} className={`buddy-home${awake?'':' is-resting'}`} id="buddy-companion" aria-label="끼니 키우기">
  <header><div><span className="buddy-eyebrow">나의 식사 친구</span><h2>끼니와 함께 자라는 일상</h2></div><span className="buddy-level">Lv. {buddy.level}</span></header>
  <div className="companion-scene"><div className="companion-speech" aria-live={reaction?'polite':'off'}>{reaction==='grow'?`우리 한 단계 더 자랐어! ${buddy.gift}, 잘 어울려?`:reaction==='record'?'한 끼 기록 완료! 오늘도 나를 챙겨줘서 고마워.':reaction==='wave'?greetings[(touches-1)%greetings.length]:littleTalk[chatter%littleTalk.length]}</div><button type="button" data-mood={chatter%3} className={`buddy-pet${reaction?` is-${reaction}`:''}`} onClick={greet} aria-label="끼니에게 인사하기"><RiceBuddy stage={buddy.stage} animate/></button><span className="buddy-name">{buddy.name}</span><small className="buddy-touch-hint">끼니를 톡 눌러 인사해 보세요</small><button type="button" className="buddy-quiet" aria-pressed={quiet} onClick={()=>setQuiet(v=>!v)}>{quiet?'다시 놀기':'잠깐 쉬기'}</button></div>
  <div className="buddy-growth" aria-live="polite"><div><strong>함께 기록한 {buddy.days}일</strong><span>{buddy.next?`${buddy.remaining}일 뒤 새 선물`:'모든 선물을 모았어요'}</span></div><progress value={buddy.percent} max={100} aria-label="다음 성장까지의 진행률"/><p>{buddy.next?<>다음 선물은 <b>{buddy.next.gift}</b>예요.</>:'앞으로도 끼니와 식사 기록을 쌓아가요.'}</p></div>
  {guest?<button className="buddy-action" type="button" onClick={onLogin}>로그인하고 끼니 만나기</button>:<Link className="buddy-action" href={loggedToday?'/profile#weekly-report':'/record'}>{loggedToday?'끼니와 이번 주 식사 돌아보기':'오늘 먹은 한 끼 기록하기'}</Link>}
  <details className="buddy-collection"><summary>끼니의 성장 선물</summary><p>식사를 기록한 날마다 한 걸음 자라요. 하루 여러 번 기록해도 하루로 세고, 쉬어도 성장은 사라지지 않아요. 기록을 삭제하면 함께한 날도 다시 계산해요.</p><ol>{buddyStages.map((s,i)=><li key={s.days} className={i<=buddy.stage?'is-owned':''}><RiceBuddy stage={i}/><strong>{s.gift}</strong><span>{i<=buddy.stage?'함께하는 중':`${s.days}일 기록`}</span></li>)}</ol></details>
 </section>;
}
