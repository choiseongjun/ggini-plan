'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {mealTimeLocal,mealSlotLabels,type MealSlot} from '../lib/meal-time';
type Nutrition=Record<string,number|null>;
export type SavedMeal={name:string;date:string;ids:string[];nutrition?:Nutrition;mealSlot?:MealSlot};
const fields=[['calories','칼로리','kcal'],['protein','단백질','g'],['carbs','탄수화물','g'],['fat','지방','g'],['sugar','당류','g'],['sodium','나트륨','mg']] as const;
export function RecordSavedFeedback({meal}:{meal:SavedMeal}){
 const [totals,setTotals]=useState<Nutrition|null>(null),[error,setError]=useState(false);
 useEffect(()=>{const controller=new AbortController();fetch(`/api/food-intake?date=${meal.date}`,{cache:'no-store',signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{if(!controller.signal.aborted)setTotals(Object.fromEntries(fields.map(([key])=>[key,data.logs.some((log:Nutrition)=>log[key]!=null)?data.logs.reduce((sum:number,log:Nutrition)=>sum+(log[key]??0),0):null])));}).catch(()=>{if(!controller.signal.aborted)setError(true);});return()=>controller.abort();},[meal]);
 const format=(value:number|null|undefined,unit:string)=>value==null?'미확인':`${Math.round(value*10)/10} ${unit}`;
 return <div className="record-saved-feedback" role="status">
  <strong>{meal.name} 기록했어요</strong>
  <p>{meal.date} {meal.mealSlot?mealSlotLabels[meal.mealSlot]:''} · 기록한 음식 기준 영양정보</p>
  {meal.nutrition&&<dl>{fields.map(([key,label,unit])=><div key={key}><dt>{label}</dt><dd>{format(meal.nutrition?.[key],unit)}</dd></div>)}</dl>}
  {totals?<p><b>{meal.date===mealTimeLocal().slice(0,10)?'오늘':'기록한 날'} 누적</b> · {format(totals.calories,'kcal')} · 단백질 {format(totals.protein,'g')}</p>:<p>{error?'기록은 저장됐어요. 하루 합계는 기록 목록에서 다시 확인해 주세요.':'하루 합계를 불러오고 있어요…'}</p>}
  <small>사진 분석은 추정치예요. 미확인 영양소는 합계에서 제외돼요.</small>
  <Link href={`/record?date=${meal.date}#${meal.ids[0]?`meal-${meal.ids[0]}`:'meal-history'}`}>방금 기록 확인·수정 →</Link>
 </div>;
}
