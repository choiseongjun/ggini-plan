'use client';
import {useState} from 'react';
import {mealTimeLocal,mealTimeISO,validEatenAt} from '../lib/meal-time';
import './meal-time-picker.css';

const meals=[{label:'아침',time:'08:00'},{label:'점심',time:'12:00'},{label:'저녁',time:'18:00'},{label:'간식',time:null}] as const;
export function MealTimePicker({value,onChange,disabled=false}:{value:string;onChange:(value:string)=>void;disabled?:boolean}){
 const [selected,setSelected]=useState<string|null>(null);
 const now=mealTimeLocal(),today=now.slice(0,10),yesterday=mealTimeLocal(new Date(Date.parse(`${now}:00+09:00`)-86400000)).slice(0,10);
 const date=value?value.slice(0,10):today;
 const parsed=mealTimeISO(value);
 function choose(day:string,label:string|null){
  const meal=meals.find(item=>item.label===label);
  const candidate=`${day}T${meal?.time??now.slice(11)}`;
  // A representative meal time must never turn today's record into a future meal.
  onChange(candidate>now?now:candidate);setSelected(label);
 }
 return <div className="meal-time-picker">
  <strong>언제 먹었나요?</strong>
  <div className="meal-time-choices" role="group" aria-label="먹은 날">
   {[{label:'오늘',date:today},{label:'어제',date:yesterday}].map(day=><button type="button" key={day.label} aria-pressed={date===day.date} disabled={disabled} onClick={()=>choose(day.date,selected)}>{day.label}</button>)}
  </div>
  <div className="meal-time-choices" role="group" aria-label="먹은 끼니">
   {meals.map(meal=><button type="button" key={meal.label} aria-pressed={selected===meal.label} disabled={disabled} onClick={()=>choose(date,meal.label)}>{meal.label}</button>)}
  </div>
  <small>{selected?`${date===today?'오늘':date===yesterday?'어제':date} ${selected} · ${value.slice(11)} 기준으로 기록해요.`:value?`${date===today?'오늘':date===yesterday?'어제':date} ${value.slice(11)}에 먹은 기록이에요.`:'선택하지 않으면 현재 시간으로 기록해요.'}</small>
  {value&&(!parsed||!validEatenAt(parsed))&&<p role="alert">먹은 날짜와 시간을 확인해 주세요. 미래 시각은 기록할 수 없어요.</p>}
 </div>;
}
