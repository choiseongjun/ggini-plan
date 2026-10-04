'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {pantryToday} from '../lib/pantry-inventory';
import type {WellnessAction} from '../lib/wellness-input';
import './wellness-tracker.css';
type Settings={waterEnabled:boolean;weightEnabled:boolean;cupMl:number;goalMl:number|null;version:number};
type Data={date:string;settings:Settings;water:{id:string;ml:number}[];weights:{day:string;kg:number}[]};
export function WellnessTracker({userId,date=pantryToday(),settingsOnly=false,onLogin}:{userId?:string;date?:string;settingsOnly?:boolean;onLogin:()=>void}){
 const [result,setResult]=useState<{key:string;data:Data}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
 const key=`${userId}:${date}`,data=result?.key===key?result.data:null;
 const [hasPending,setHasPending]=useState(false);
 const pending=useRef<({date:string;version:number;requestId:string}&WellnessAction)|null>(null),locked=useRef(false);
 useEffect(()=>{if(!userId)return;const c=new AbortController();fetch(`/api/wellness?date=${date}`,{cache:'no-store',signal:c.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(!c.signal.aborted){setResult({key,data:d});setError('');}}).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[userId,date,key,revision]);
 useEffect(()=>{const refresh=()=>{if(!pending.current)setRevision(v=>v+1);};window.addEventListener('wellness-changed',refresh);window.addEventListener('focus',refresh);return()=>{window.removeEventListener('wellness-changed',refresh);window.removeEventListener('focus',refresh);};},[]);
 async function send(action?:WellnessAction){
  if(locked.current||!data)return;
  if(action){if(pending.current)return;pending.current={...action,date,version:data.settings.version,requestId:crypto.randomUUID()};}
  if(!pending.current)return;setHasPending(true);locked.current=true;setBusy(true);setError('');
  try{const r=await fetch('/api/wellness',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pending.current)});const d=await r.json();if(!r.ok){if(r.status===409){pending.current=null;setHasPending(false);setResult(null);}throw Error(d.error);}
   pending.current=null;setHasPending(false);setResult(null);setRevision(v=>v+1);window.dispatchEvent(new Event('wellness-changed'));
  }catch(e){setError(e instanceof Error?e.message:'연결을 확인해 주세요.');}finally{locked.current=false;setBusy(false);}
 }
 if(!userId)return <section className="wellness"><h3>{settingsOnly?'기록 항목 설정':'물·체중 기록'}</h3><button type="button" onClick={onLogin}>로그인하고 기록하기</button></section>;
 const disabled=busy||hasPending;
 return <section className="wellness" aria-label={settingsOnly?'기록 항목 설정':'물과 체중 기록'}>
 {error&&<p role="alert">{error} {hasPending?<button type="button" disabled={busy} onClick={()=>void send()}>같은 요청 다시 확인</button>:<button type="button" onClick={()=>setRevision(v=>v+1)}>다시 불러오기</button>}</p>}
 {!data?!error&&<p role="status">기록을 불러오고 있어요…</p>:settingsOnly?<WellnessSettings key={data.settings.version} settings={data.settings} disabled={disabled} onSave={a=>void send(a)}/>:<>
 <header><h3>하루 건강 기록</h3><Link href="/profile#wellness-settings">표시 설정</Link></header><p className="wellness-date">{date} 기준</p>
 {!data.settings.waterEnabled&&!data.settings.weightEnabled&&<p>표시 설정에서 물·체중 기록을 켤 수 있어요.</p>}
 {data.settings.waterEnabled&&<article><h4>물 섭취</h4><strong className="wellness-value">{data.water.reduce((sum,w)=>sum+w.ml,0).toLocaleString()} <small>ml</small></strong>{data.settings.goalMl!==null&&<><p>내가 정한 목표 {data.settings.goalMl.toLocaleString()} ml</p><progress aria-label="물 섭취 목표 진행" max={data.settings.goalMl} value={Math.min(data.settings.goalMl,data.water.reduce((sum,w)=>sum+w.ml,0))}/></>}
 <WaterAmountPicker defaultMl={data.settings.cupMl} disabled={disabled} onAdd={ml=>void send({action:'water',ml})}/><div className="wellness-actions"><button type="button" disabled={disabled||!data.water.length} onClick={()=>{const last=data.water.at(-1);if(last)void send({action:'undoWater',id:last.id});}}>마지막 추가 취소</button></div></article>}
 {data.settings.weightEnabled&&<WeightCard key={`${date}:${data.settings.version}`} data={data} disabled={disabled} onSave={kg=>void send({action:'weight',kg})}/>}
 </>}
 </section>;
}
function WaterAmountPicker({defaultMl,disabled,onAdd}:{defaultMl:number;disabled:boolean;onAdd:(ml:number)=>void}){
 const [amount,setAmount]=useState(String(defaultMl)),[custom,setCustom]=useState(![100,200,300,500].includes(defaultMl));
 const ml=Number(amount),valid=amount.trim()!==''&&Number.isInteger(ml)&&ml>=10&&ml<=2000;
 return <form className="water-amount-picker" onSubmit={e=>{e.preventDefault();if(valid&&!disabled)onAdd(ml);}}><fieldset disabled={disabled}><legend>얼마나 마셨나요?</legend><div className="water-amount-options">{[100,200,300,500].map(n=><button key={n} type="button" aria-pressed={!custom&&ml===n} onClick={()=>{setCustom(false);setAmount(String(n));}}>{n} ml</button>)}<button type="button" aria-pressed={custom} onClick={()=>setCustom(true)}>직접 입력</button></div>{custom&&<label>마신 양 (ml)<input type="number" inputMode="numeric" min="10" max="2000" step="1" required value={amount} onChange={e=>setAmount(e.target.value)}/><small>10~2,000 ml 사이로 입력해 주세요.</small></label>}<button className="water-amount-submit" type="submit" disabled={!valid||disabled}>{valid?`+ ${ml.toLocaleString()} ml 기록`:'마신 양을 입력해 주세요'}</button></fieldset></form>;
}
function WellnessSettings({settings:s,disabled,onSave}:{settings:Settings;disabled:boolean;onSave:(a:WellnessAction)=>void}){
 const [water,setWater]=useState(s.waterEnabled),[weight,setWeight]=useState(s.weightEnabled),[cup,setCup]=useState(String(s.cupMl)),[goal,setGoal]=useState(s.goalMl===null?'':String(s.goalMl));
 return <form onSubmit={e=>{e.preventDefault();onSave({action:'settings',waterEnabled:water,weightEnabled:weight,cupMl:Number(cup),goalMl:goal===''?null:Number(goal)});}}><h3>기록 항목 설정</h3><fieldset disabled={disabled}><label className="wellness-toggle"><input type="checkbox" checked={water} onChange={e=>setWater(e.target.checked)}/>물 섭취 기록 표시</label><label className="wellness-toggle"><input type="checkbox" checked={weight} onChange={e=>setWeight(e.target.checked)}/>체중 기록 표시</label><label>한 잔 용량 (ml)<input required type="number" min="10" max="2000" step="1" value={cup} onChange={e=>setCup(e.target.value)}/></label><label>하루 물 목표 (ml · 선택)<input type="number" min="100" max="10000" step="1" placeholder="목표 없이 기록" value={goal} onChange={e=>setGoal(e.target.value)}/></label><p>목표는 직접 정해요. 표시를 꺼도 기존 기록은 남아 있어요.</p><button type="submit">설정 저장</button></fieldset></form>;
}
function WeightCard({data,disabled,onSave}:{data:Data;disabled:boolean;onSave:(kg:number|null)=>void}){
 const current=data.weights.find(w=>w.day===data.date),[value,setValue]=useState(current?String(current.kg):'');
 const weights=data.weights,low=Math.min(...weights.map(w=>w.kg))-0.5,high=Math.max(...weights.map(w=>w.kg))+0.5;
 const start=Date.parse(`${data.date}T00:00:00Z`)-29*86400000;
 const points=weights.map(w=>`${10+(Date.parse(`${w.day}T00:00:00Z`)-start)/86400000/29*280},${90-(w.kg-low)/(high-low)*70}`).join(' ');
 return <article><h4>체중 기록</h4><form onSubmit={e=>{e.preventDefault();onSave(Number(value));}}><label>{data.date} 체중 (kg)<input required disabled={disabled} type="number" min="1" max="500" step="0.1" inputMode="decimal" value={value} onChange={e=>setValue(e.target.value)} placeholder="예: 65.2"/></label><div className="wellness-actions"><button disabled={disabled||!value} type="submit">{current?'체중 수정':'체중 저장'}</button>{current&&<button type="button" disabled={disabled} onClick={()=>onSave(null)}>이 날짜 기록 삭제</button>}</div></form>
 <p>선택한 날짜까지 최근 30일 · 기록한 날만 표시해요.</p>{weights.length>=2&&<svg className="wellness-chart" viewBox="0 0 300 110" role="img" aria-label={`체중 변화: ${weights[0].day} ${weights[0].kg}kg에서 ${weights.at(-1)!.day} ${weights.at(-1)!.kg}kg`}><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2"/><text x="10" y="108">{weights[0].kg} kg → {weights.at(-1)!.kg} kg</text></svg>}
 {weights.length>0&&<details><summary>날짜별 체중 보기</summary><ul>{weights.map(w=><li key={w.day}><time>{w.day}</time><strong>{w.kg} kg</strong></li>)}</ul></details>}
 </article>;
}
