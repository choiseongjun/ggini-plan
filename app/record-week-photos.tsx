'use client';
import {useEffect,useState} from 'react';
import {weekStart} from '../lib/intake-stats';
import {subscribeRecordSync} from '../lib/record-sync';
import {inferredMealSlot,mealSlots,mealSlotLabels,type MealSlot} from '../lib/meal-time';
type WeekLog={mealSlot?:MealSlot|null;id:string;name:string;date:string;eatenAt:string;photoCount:number};
export function RecordWeekPhotos({userId,date,today,onDate}:{userId:string;date:string;today:string;onDate:(date:string)=>void}){
 const from=weekStart(date),end=new Date(`${from}T00:00:00Z`);end.setUTCDate(end.getUTCDate()+6);const to=end.toISOString().slice(0,10);
 const key=`${userId}:${from}`;
 const [result,setResult]=useState<{key:string;logs:WeekLog[]}|null>(null),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{const refresh=()=>setRevision(n=>n+1);window.addEventListener('intake-logged',refresh);window.addEventListener('shopping-progress-changed',refresh);const stop=subscribeRecordSync(refresh);return()=>{window.removeEventListener('intake-logged',refresh);window.removeEventListener('shopping-progress-changed',refresh);stop();};},[]);
 useEffect(()=>{const controller=new AbortController();fetch(`/api/food-intake?from=${from}&to=${to}`,{cache:'no-store',signal:controller.signal}).then(async r=>{if(!r.ok)throw Error('사진 모음을 불러오지 못했어요.');return r.json();}).then(data=>{if(!controller.signal.aborted){setResult({key,logs:data.logs});setError('');}}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[key,from,to,revision]);
 const logs=result?.key===key?result.logs:null;
 const counts=mealSlots.map(slot=>({period:mealSlotLabels[slot],count:logs?.filter(l=>(l.mealSlot??inferredMealSlot(l.eatenAt))===slot).length??0}));const peak=[...counts].sort((a,b)=>b.count-a.count);
 return <section className="record-week-album" aria-label="일주일 식사 사진 모음"><header><div><span>한 주의 식탁</span><h3>사진으로 꺼내 보는 한 주</h3></div><small>{from.slice(5).replace('-','/')} – {to.slice(5).replace('-','/')}</small></header>
 {error?<p role="alert">{error} <button type="button" onClick={()=>setRevision(n=>n+1)}>다시 보기</button></p>:!logs?<p role="status">한 주의 기록을 모으고 있어요…</p>:<>
 <div className="record-week-strip">{Array.from({length:7},(_,i)=>{const d=new Date(`${from}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+i);const day=d.toISOString().slice(0,10),items=logs.filter(l=>l.date===day),cover=items.find(l=>l.photoCount>0);return <button type="button" key={day} disabled={day>today} className={day===date?'is-selected':''} onClick={()=>onDate(day)} aria-label={`${day} 기록 ${items.length}건 보기`} aria-pressed={day===date}><span className="record-week-cover">{cover?/* eslint-disable-next-line @next/next/no-img-element -- authenticated private diary image */
 <img src={`/api/food-intake/photo?id=${cover.id}&position=0`} alt={cover.name} loading="lazy"/>:<span aria-hidden="true">{items.length?'✎':'·'}</span>}</span><b>{['월','화','수','목','금','토','일'][i]}</b><small>{items.length?`${items.length}건`:'—'}</small></button>;})}</div>
 <p>{logs.length?`${new Set(logs.map(l=>l.date)).size}일의 식사 이야기가 쌓였어요.`:'사진이 없어도 괜찮아요. 음식 이름으로 남긴 기록도 함께 모여요.'}</p>
 {logs.length>=3&&peak[0].count>peak[1].count&&<small className="record-week-insight">이번에 보는 한 주는 {peak[0].period} 기록이 가장 많아요. 기록한 음식만 기준으로 살펴봤어요.</small>}
 </>}
 </section>;
}
