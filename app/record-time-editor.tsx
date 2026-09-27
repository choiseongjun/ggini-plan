'use client';
import {useState} from 'react';
import {mealTimeLocal,mealTimeISO,validEatenAt,inferredMealSlot,type MealSlot} from '../lib/meal-time';
import './meal-time-picker.css';
import {MealTimePicker} from './meal-time-picker';

export function RecordTimeEditor({id,name,time,mealSlot,version,disabled,onSaved}:{mealSlot?:MealSlot|null;id:string;name:string;time:string;version:number;disabled:boolean;onSaved:(date:string)=>void}){
 const [open,setOpen]=useState(false),[value,setValue]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [slot,setSlot]=useState<MealSlot|null>(null);
 const parsed=mealTimeISO(value),valid=!!parsed&&validEatenAt(parsed);
 async function save(){
  if(!parsed||!valid||busy)return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/food-intake',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,version,eatenAt:parsed,mealSlot:slot})});
   const result=await response.json();if(!response.ok)throw Error(result.error??'시간을 수정하지 못했어요.');
   setOpen(false);onSaved(value.slice(0,10));window.dispatchEvent(new CustomEvent('intake-logged'));
  }catch(e){setError(e instanceof Error?e.message:'시간을 수정하지 못했어요.');}finally{setBusy(false);}
 }
 return open?<div className="meal-time-picker record-time-editor"><strong>{name} · 먹은 끼니</strong><MealTimePicker value={value} onChange={setValue} slot={slot} onSlotChange={setSlot} disabled={busy||disabled}/><button type="button" disabled={busy||disabled||!valid} onClick={()=>void save()}>{busy?'저장 중…':'끼니 저장'}</button><button type="button" disabled={busy} onClick={()=>setOpen(false)}>취소</button>{error&&<p role="alert">{error}</p>}</div>:<button type="button" disabled={disabled} aria-label={`${name} 끼니 수정`} onClick={()=>{setValue(mealTimeLocal(time));setSlot(mealSlot??inferredMealSlot(time));setError('');setOpen(true);}}>끼니 수정</button>;
}
