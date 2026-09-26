'use client';
import {useState} from 'react';
import {mealTimeLocal,mealTimeISO,validEatenAt} from '../lib/meal-time';
import './meal-time-picker.css';

export function RecordTimeEditor({id,name,time,version,disabled,onSaved}:{id:string;name:string;time:string;version:number;disabled:boolean;onSaved:(date:string)=>void}){
 const [open,setOpen]=useState(false),[value,setValue]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const parsed=mealTimeISO(value),valid=!!parsed&&validEatenAt(parsed);
 async function save(){
  if(!parsed||!valid||busy)return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/food-intake',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,version,eatenAt:parsed})});
   const result=await response.json();if(!response.ok)throw Error(result.error??'시간을 수정하지 못했어요.');
   setOpen(false);onSaved(value.slice(0,10));window.dispatchEvent(new CustomEvent('intake-logged'));
  }catch(e){setError(e instanceof Error?e.message:'시간을 수정하지 못했어요.');}finally{setBusy(false);}
 }
 return open?<div className="meal-time-picker record-time-editor"><label>{name} · 먹은 시간<input type="datetime-local" aria-label={`${name} 먹은 시간 수정`} value={value} min="2000-01-01T00:00" max={mealTimeLocal()} disabled={busy||disabled} onInput={event=>setValue(event.currentTarget.value)}/></label><small>한국 시간 기준 · 날짜를 바꾸면 해당 날짜로 기록이 이동해요.</small><button type="button" disabled={busy||disabled||!valid} onClick={()=>void save()}>{busy?'저장 중…':'시간 저장'}</button><button type="button" disabled={busy} onClick={()=>setOpen(false)}>취소</button>{error&&<p role="alert">{error}</p>}</div>:<button type="button" disabled={disabled} aria-label={`${name} 시간 수정`} onClick={()=>{setValue(mealTimeLocal(time));setError('');setOpen(true);}}>시간 수정</button>;
}
