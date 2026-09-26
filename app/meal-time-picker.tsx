'use client';
import {mealTimeLocal,mealTimeISO,validEatenAt} from '../lib/meal-time';
import './meal-time-picker.css';

export function MealTimePicker({value,onChange,disabled=false}:{value:string;onChange:(value:string)=>void;disabled?:boolean}){
 const parsed=mealTimeISO(value);
 return <details className="meal-time-picker">
  <summary>먹은 시간 · {value?value.replace('T',' '):'지금'} <span>변경</span></summary>
  <label>실제로 먹은 날짜·시간<input type="datetime-local" aria-label="실제로 먹은 날짜·시간" min="2000-01-01T00:00" max={mealTimeLocal()} value={value} disabled={disabled} onInput={event=>onChange(event.currentTarget.value)}/></label>
  <button type="button" disabled={disabled} onClick={()=>onChange('')}>지금 먹었어요</button>
  <small>한국 시간 기준 · 어제 먹은 음식도 기록할 수 있어요.</small>
  {value&&(!parsed||!validEatenAt(parsed))&&<p role="alert">먹은 날짜와 시간을 확인해 주세요. 미래 시각은 기록할 수 없어요.</p>}
 </details>;
}
