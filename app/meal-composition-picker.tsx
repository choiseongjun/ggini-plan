'use client';
import './meal-composition-picker.css';

export function MealCompositionPicker({value,onChange,disabled}:{value:number;onChange:(count:number)=>void;disabled:boolean}){
 return <fieldset className="meal-composition-picker" disabled={disabled}>
  <legend>어떻게 차릴까요?</legend>
  <div>{[{count:0,emoji:'🍲',label:'간단하게',hint:'기본 메뉴'},{count:1,emoji:'🍚',label:'밥과 반찬',hint:'메인 + 반찬 1개'},{count:2,emoji:'🥗',label:'든든한 한 상',hint:'메인 + 반찬 2개'}].map(option=><button type="button" key={option.count} aria-pressed={value===option.count} onClick={()=>onChange(option.count)}><span aria-hidden="true">{option.emoji}</span><strong>{option.label}</strong><small>{option.hint}</small></button>)}</div>
  <p>{value>0?'밥·메인·반찬을 함께 추천해요. 여러 요리를 준비하므로 30분 이상도 가능한 구성으로 찾아요.':'요리 하나를 중심으로 추천해요. 메뉴에 따라 밥이 포함돼요.'}</p>
 </fieldset>;
}
