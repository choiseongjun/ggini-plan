'use client';
import {mealTimeLocal,mealTimeISO,validEatenAt,mealSlots,mealSlotLabels,type MealSlot} from '../lib/meal-time';
import './meal-time-picker.css';


export type MealTimeSelection={value:string;slot:MealSlot|null;onChange:(value:string)=>void;onSlotChange:(slot:MealSlot|null)=>void};

export function MealTimePicker({value,onChange,slot,onSlotChange,disabled=false}:{slot:MealSlot|null;onSlotChange:(slot:MealSlot)=>void;value:string;onChange:(value:string)=>void;disabled?:boolean}){
 const now=mealTimeLocal(),today=now.slice(0,10),yesterday=mealTimeLocal(new Date(Date.parse(`${now}:00+09:00`)-86400000)).slice(0,10);
 const date=value?value.slice(0,10):today;
 const parsed=mealTimeISO(value);
 function choose(day:string){onChange(`${day}T${mealTimeLocal().slice(11)}`);}
 return <div className="meal-time-picker">
  <strong>언제 먹었나요?</strong>
  <div className="meal-time-choices" role="group" aria-label="먹은 날">
   {[{label:'오늘',date:today},{label:'어제',date:yesterday}].map(day=><button type="button" key={day.label} aria-pressed={date===day.date} disabled={disabled} onClick={()=>choose(day.date)}>{day.label}</button>)}
  </div>
  <div className="meal-time-choices" role="group" aria-label="먹은 끼니">
   {mealSlots.map(meal=><button type="button" key={meal} aria-pressed={slot===meal} disabled={disabled} onClick={()=>onSlotChange(meal)}>{mealSlotLabels[meal]}</button>)}
  </div>
  <small>{slot?`${date===today?'오늘':date===yesterday?'어제':date} ${mealSlotLabels[slot]}으로 기록해요.`:'먹은 끼니를 골라 주세요.'}</small>
  {value&&(!parsed||!validEatenAt(parsed))&&<p role="alert">먹은 날짜와 시간을 확인해 주세요. 미래 시각은 기록할 수 없어요.</p>}
 </div>;
}
