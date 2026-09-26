'use client';
import './meal-composition-picker.css';
import {sideCountFor,slotLabels,type MealSlot,type MealSideCounts,type PlanConditions} from '../lib/shopping-plan';

// Small tableware illustrations share the same palette and hand-drawn curves.
export function MealTableIllustration({sides=0}:{sides?:number}){
 return <svg className="meal-table-illustration" viewBox="0 0 160 110" fill="none" aria-hidden="true">
  <ellipse cx="80" cy="97" rx="56" ry="6" fill="#67674B" opacity=".07"/>
  <rect x="13" y="17" width="134" height="77" rx="27" fill="#E8D9BC"/>
  <rect x="18" y="21" width="124" height="67" rx="23" fill="#F3E8D3" stroke="#D8C6A6"/>
  <path d="M26 73C47 81 110 82 132 73" stroke="#E2D3B5" strokeWidth="1.5" strokeLinecap="round"/>
  {sides===0?<>
   <ellipse cx="75" cy="58" rx="34" ry="27" fill="#D6C8AA" opacity=".45"/>
   <ellipse cx="75" cy="54" rx="34" ry="27" fill="#FFFCF3" stroke="#D9D3BD" strokeWidth="1.5"/>
   <ellipse cx="75" cy="54" rx="27" ry="20" fill="#E8EBCF"/>
   <path d="M57 53C54 40 64 34 75 40C86 34 97 45 94 55C92 66 60 66 57 53Z" fill="#FFFEF5"/>
   <path d="m65 46 3 1m12-5 3 1m3 10 3-1" stroke="#E2DBC0" strokeWidth="2.3" strokeLinecap="round"/>
   <circle cx="69" cy="53" r="1.6" fill="#59664E"/><circle cx="81" cy="53" r="1.6" fill="#59664E"/>
   <path d="M72 58q3 3 6 0" stroke="#59664E" strokeWidth="1.7" strokeLinecap="round"/>
   <ellipse cx="64" cy="57" rx="3" ry="1.6" fill="#E6AB8D"/><ellipse cx="87" cy="57" rx="3" ry="1.6" fill="#E6AB8D"/>
   <path d="M54 63q-9-2-9-9q10-1 12 7M94 62q9-2 10-9q-10 0-12 7" fill="#8A9E72"/>
   <ellipse cx="55" cy="42" rx="5" ry="3" fill="#DFA87A" transform="rotate(-25 55 42)"/>
  </>:<>
   <ellipse cx="58" cy="59" rx="27" ry="23" fill="#D6C8AA" opacity=".4"/>
   <ellipse cx="58" cy="55" rx="27" ry="23" fill="#FFFCF3" stroke="#D9D3BD" strokeWidth="1.5"/>
   <path d="M37 55C34 41 46 35 52 40C59 31 72 40 71 45C84 50 75 67 58 67C47 67 38 63 37 55Z" fill="#F1ECD9"/>
   <path d="m44 48 3 1m11-7 3 1m5 9 3-1" stroke="#D5CCAC" strokeWidth="2" strokeLinecap="round"/>
   <circle cx="50" cy="55" r="1.6" fill="#59664E"/><circle cx="63" cy="55" r="1.6" fill="#59664E"/>
   <path d="M53 60q4 3 7-1" stroke="#59664E" strokeWidth="1.6" strokeLinecap="round"/>
   <ellipse cx="45" cy="59" rx="3" ry="1.5" fill="#E6AB8D"/>
   <rect x="91" y="53" width="37" height="26" rx="11" fill="#FFF9EF" stroke="#D9D3BD" strokeWidth="1.5"/>
   <path d="m99 64 5-4 7 5 7-5 3 7-6 6-9-2-7 1Z" fill="#BB805F"/>
   <path d="m104 63 7 5m-1-7 7 5" stroke="#DCA580" strokeWidth="2" strokeLinecap="round"/>
   <ellipse cx="109" cy="35" rx="18" ry="13" fill="#EEF1E1" stroke="#B8C4A2" strokeWidth="1.5"/>
   <path d="M97 35q4-12 11-2q8-10 12 0q-3 10-12 7q-8 6-11-5" fill="#8DAB7B"/>
   <path d="m102 34 10 3 4-5" stroke="#C4D2A7" strokeWidth="2" strokeLinecap="round"/>
   {sides===2&&<><ellipse cx="37" cy="27" rx="15" ry="11" fill="#F7E2D3" stroke="#D7B29B" strokeWidth="1.5"/><path d="m29 24 8-3 6 6-8 5-6-4Z" fill="#D7936D"/><path d="m33 24 6 4" stroke="#EDBD91" strokeWidth="2" strokeLinecap="round"/></>}
  </>}
  <path d="m135 37-3 33m8-32-3 33" stroke="#8E795C" strokeWidth="2.8" strokeLinecap="round"/>
 </svg>;
}

const options=[{count:0,label:'간단하게',hint:'기본 메뉴'},{count:1,label:'밥과 반찬',hint:'반찬 1개'},{count:2,label:'든든한 한 상',hint:'반찬 2개'}];
export function MealCompositionPicker({conditions,onChange,disabled}:{conditions:PlanConditions;onChange:(counts:MealSideCounts)=>void;disabled:boolean}){
 const slots=conditions.slots??['dinner'];
 const counts=Object.fromEntries((Object.keys(slotLabels) as MealSlot[]).map(slot=>[slot,sideCountFor(conditions,slot)]));
 return <fieldset className="meal-composition-picker meal-composition-by-slot" disabled={disabled}>
  <legend>끼니마다 어떻게 차릴까요?</legend>
  <p className="meal-composition-intro">아침은 간단하게, 저녁은 든든하게. 끼니마다 골라요.</p>
  {slots.map(slot=><fieldset className="meal-composition-slot" key={slot}>
   <legend>{slotLabels[slot]}</legend>
   <div className="meal-composition-options">{options.map(option=><button type="button" key={option.count} aria-label={`${slotLabels[slot]} ${option.label}`} aria-pressed={counts[slot]===option.count} onClick={()=>onChange({...counts,[slot]:option.count})}>
    <MealTableIllustration sides={option.count}/><strong>{option.label}</strong><small>{option.hint}</small>
   </button>)}</div>
   <button className="meal-composition-apply" type="button" onClick={()=>onChange({breakfast:counts[slot],lunch:counts[slot],dinner:counts[slot]})}>{slotLabels[slot]} 구성으로 모든 끼니에 적용</button>
  </fieldset>)}
  <p className="meal-composition-note"><span aria-hidden="true"/>반찬을 함께 고른 끼니는 조리에 30분 이상 여유를 두세요.</p>
 </fieldset>;
}
