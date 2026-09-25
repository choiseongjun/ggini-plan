'use client';
import {useEffect,useRef,useState} from 'react';
type Estimate={low:number;high:number;missing:number;aiCount:number;count:number;from:string;to:string};
export function EstimatedFoodCost({date}:{date:string}){
 const [revision,setRevision]=useState(0),[data,setData]=useState<Estimate|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const generation=useRef(0);
 useEffect(()=>{const refresh=()=>setRevision(n=>n+1);const changed=(e:Event)=>{if((e as CustomEvent).detail?.source==='intake')refresh();};window.addEventListener('intake-logged',refresh);window.addEventListener('shopping-progress-changed',changed);return()=>{window.removeEventListener('intake-logged',refresh);window.removeEventListener('shopping-progress-changed',changed);};},[]);
 useEffect(()=>{const controller=new AbortController();const token=++generation.current;
  queueMicrotask(()=>{if(!controller.signal.aborted){setData(null);setError('');setBusy(false);}});
  fetch(`/api/food-intake/estimated-cost?date=${date}`,{cache:'no-store',signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);return d;}).then(d=>{if(generation.current===token)setData(d);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
  return()=>{controller.abort();generation.current=token+1;};
 },[date,revision]);
 async function calculate(){const token=generation.current;setBusy(true);setError('');try{const r=await fetch(`/api/food-intake/estimated-cost?date=${date}`,{method:'POST'});const d=await r.json();if(!r.ok)throw Error(d.error);if(token===generation.current)setData(d);}catch(e){if(token===generation.current)setError(e instanceof Error?e.message:'다시 시도해 주세요.');}finally{if(token===generation.current)setBusy(false);}}
 const money=(n:number)=>n.toLocaleString('ko-KR');
 return <section className="estimated-food-cost" aria-label="주간 예상 식비"><span className="section-kicker">먹은 기록으로 보는</span><h3>한 주 예상 식비</h3>{data&&<small>{data.from.slice(5).replace('-','.')} – {data.to.slice(5).replace('-','.')}</small>}
 {!data&&!error&&<p role="status">이번 주 기록을 확인하고 있어요.</p>}
 {data&&(data.count===0?<p>이 주에 먹은 음식을 기록하면 예상 식비를 볼 수 있어요.</p>:<><p>{data.missing>0?'가격을 아는 음식 합계':'기록한 음식의 예상 비용'}</p><strong>{data.count===data.missing?'아직 계산 전':`약 ${money(data.low)}${data.high!==data.low?`~${money(data.high)}`:''}원`}</strong><p>식사 기록 {data.count}건{data.aiCount>0?` · AI 추정 ${data.aiCount}건`:''}{data.missing>0?` · 금액 미확인 ${data.missing}건 제외`:''}</p>{data.missing>0&&<button type="button" disabled={busy} onClick={()=>void calculate()}>{busy?'음식별 비용을 추정하고 있어요…':'AI로 예상 식비 계산하기'}</button>}<small>실제 결제액이 아니에요. 등록 가격을 우선 사용하고, 가격이 없는 음식은 이름과 먹은 양을 AI로 분석해 범위로 추정해요. 집밥·외식 여부에 따라 차이가 날 수 있어요.</small></>)}
 {error&&<p role="alert">{error} <button type="button" disabled={busy} onClick={()=>setRevision(n=>n+1)}>다시 불러오기</button></p>}
 </section>;
}
