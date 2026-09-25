'use client';
import {cookingEfforts,type CookingEffort} from '../lib/cooking-effort';
import './cooking-effort-picker.css';
export function CookingEffortPicker({value='easy',onChange,disabled=false}:{value?:CookingEffort;onChange:(value:CookingEffort)=>void;disabled?:boolean}){
 return <fieldset className="cooking-effort-picker" disabled={disabled}><legend>어느 정도로 요리하고 싶나요?</legend><div>{(Object.keys(cookingEfforts) as CookingEffort[]).map(key=>{const item=cookingEfforts[key];return <button type="button" key={key} aria-pressed={value===key} onClick={()=>onChange(key)}><span className="effort-check" aria-hidden="true">{value===key?'✓':''}</span><span><strong>{item.label}{key==='easy'&&<em>추천</em>}</strong><small>{item.description}</small></span><span className="effort-time">{item.time}</span></button>;})}</div><p>시간은 참고용이에요. 손질과 조리 단계도 함께 고려해요.</p></fieldset>;
}
