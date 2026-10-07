'use client';
import {useEffect,useRef,useState} from 'react';
import {Button} from '../components/ui';
import {rouletteCandidates,rouletteRotation} from '../../lib/taste-roulette';
import s from './taste.module.css';

export default function TasteRoulette({names,disabled,onStart,onPick}:{names:string[];disabled:boolean;onStart:()=>void;onPick:(index:number)=>void}){
 const wheel=useRef<SVGSVGElement>(null);
 const animation=useRef<Animation|null>(null);
 const rotation=useRef(0),busy=useRef(false);
 const previous=useRef<number|null>(null);
 const [spinning,setSpinning]=useState(false),[winner,setWinner]=useState<number|null>(null);
 useEffect(()=>()=>{animation.current?.cancel();},[]);
 async function spin(){
  if(busy.current||disabled||!wheel.current)return;
  busy.current=true;setSpinning(true);setWinner(null);onStart();
  // Equal odds among eligible menus; a reroll excludes the last winner.
  const candidates=rouletteCandidates(names.length,previous.current);
  const values=new Uint32Array(1),limit=2**32-(2**32%candidates.length);
  do{crypto.getRandomValues(values);}while(values[0]>=limit);
  const index=candidates[values[0]%candidates.length];
  crypto.getRandomValues(values);
  const from=rotation.current,to=rouletteRotation(from,index,names.length,values[0]/2**32-.5);
  animation.current?.cancel();
  wheel.current.style.transform=`rotate(${from}deg)`;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const run=wheel.current.animate([{transform:`rotate(${from}deg)`},{transform:`rotate(${to}deg)`}],{duration:reduced?0:4600,easing:'cubic-bezier(.12,.72,.12,1)',fill:'forwards'});
  animation.current=run;
  try{await run.finished;}catch{return;}
  wheel.current!.style.transform=`rotate(${to%360}deg)`;
  run.cancel();animation.current=null;
  rotation.current=to%360;previous.current=index;busy.current=false;setSpinning(false);setWinner(index);onPick(index);
 }
 const point=(angle:number,r=146)=>{const a=(angle-90)*Math.PI/180;return [160+r*Math.cos(a),160+r*Math.sin(a)];};
 return <section className={s.roulette} aria-labelledby="roulette-title">
  <span className={s.eyebrow}>ONE SPIN, ONE MEAL</span><h2 id="roulette-title">오늘 한 끼, 돌려서 정해요</h2><p>처음엔 {names.length}가지 중에서, 다시 돌릴 땐 직전 메뉴를 빼고 골라요.</p>
  <div className={s.wheelStage} data-spinning={spinning}>
   <div className={s.pointer} aria-hidden="true"/>
   <svg ref={wheel} className={s.wheel} viewBox="0 0 320 320" role="img" aria-label={`메뉴 룰렛: ${names.join(', ')}`}>
    <circle cx="160" cy="160" r="157" className={s.wheelRim}/>
    {names.map((name,i)=>{const step=360/names.length,start=point(i*step),end=point((i+1)*step),label=point((i+.5)*step,96);return <g key={name}>
     <path d={`M160 160 L${start.join(' ')} A146 146 0 ${step>180?1:0} 1 ${end.join(' ')} Z`} className={i%2?s.wedgeLight:s.wedgeDark}/>
     <text x={label[0]} y={label[1]} textAnchor="middle" dominantBaseline="middle" className={i%2?s.labelDark:s.labelLight} transform={`rotate(${(i+.5)*step},${label[0]},${label[1]})`}>{name}</text>
    </g>;})}
    {Array.from({length:24},(_,i)=>{const p=point(i*15,152);return <circle key={i} cx={p[0]} cy={p[1]} r="2" className={s.rimDot}/>;})}
   </svg>
   <div className={s.wheelHub} aria-hidden="true">오늘<br/><b>한 끼</b></div>
  </div>
  <div className={s.spinResult} role="status" aria-live="polite">{spinning?'어떤 메뉴에 멈출까요…':winner===null?'위쪽 포인터가 가리키는 메뉴로!':<>오늘의 한 끼는 <strong>{names[winner]}</strong></>}</div>
  <Button block size="lg" disabled={spinning||disabled} onClick={spin}>{spinning?'룰렛이 돌고 있어요…':winner===null?'룰렛 돌리기':'한 번 더 돌리기'}</Button>
 </section>;
}
