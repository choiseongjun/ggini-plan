'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import {trackAnalytics} from '../lib/analytics';
import {Button,Notice} from './components/ui';
import {MealTimePicker} from './meal-time-picker';
import {mealTimeLocal,mealTimeISO,inferredMealSlot,type MealSlot} from '../lib/meal-time';
import {photoReviewState} from '../lib/photo-review-state';
import {searchFoods} from '../lib/food-search-client';
import {manualFoodReference} from '../lib/basic-food-reference';
import {validPortions} from '../lib/food-intake';
import type {FoodReference} from '../lib/food-reference';
import type {MealDraft,PhotoMealItem} from '../lib/meal-draft';
import type {PhotoFood} from '../lib/groq-food-photo';
import {INTAKE_LOGGED_EVENT} from './record-progress';
import styles from './nutrition-home.module.css';

export type PhotoMealSaved={ids:string[];nutrition?:Record<string,number|null>;mealSlot?:MealSlot;eatenAt?:string;food?:{name:string}};
function FoodRow({item,index,locked,onChange,onRemove,onResolve}:{item:PhotoMealItem;index:number;locked:boolean;onChange:(item:PhotoMealItem)=>void;onRemove:()=>void;onResolve:(id:string,name:string,food:FoodReference)=>void}){
 const [results,setResults]=useState<{name:string;foods:FoodReference[];error?:string}|null>(null);
 useEffect(()=>{
  if(locked||!item.name.trim())return;
  let active=true;
  const timer=setTimeout(()=>{void searchFoods(item.name.trim()).then(data=>{
   if(!active)return;const foods=data.items.slice(0,8);setResults({name:item.name,foods});
   if(foods[0])onResolve(item.id,item.name,foods[0]);
  }).catch(()=>{if(active)setResults({name:item.name,foods:[],error:'영양정보를 불러오지 못했어요. 이름을 다시 입력하거나 영양 미확인으로 기록할 수 있어요.'});});},250);
  return()=>{active=false;clearTimeout(timer);};
 },[item.id,item.name,locked,onResolve]);
 const matches=results?.name===item.name?results:null;
 return <li className={styles.foodReviewItem}>
  <label htmlFor={`meal-name-${item.id}`}>음식 {index+1}</label>
  <input id={`meal-name-${item.id}`} value={item.name} maxLength={40} disabled={locked} placeholder="음식 이름" onChange={e=>onChange({...item,name:e.target.value,food:null})}/>
  {item.originalName&&item.originalName!==item.name&&<small>AI 추정: {item.originalName}</small>}
  {item.name.trim()&&!matches&&!item.food&&<small role="status">영양정보를 찾고 있어요…</small>}
  {matches?.error&&<small role="alert">{matches.error}</small>}
  {(item.food||!!matches?.foods.length)&&<details className={styles.reviewDetails}><summary>영양 기준: {item.food?.name??'음식 선택'} · 변경</summary><label htmlFor={`meal-food-${item.id}`}>실제 음식과 가까운 기준을 선택하세요</label>
   <select id={`meal-food-${item.id}`} disabled={locked} value={item.food?.code??''} onChange={e=>{const food=matches?.foods.find(f=>f.code===e.target.value);if(food)onChange({...item,food});}}>
    {!item.food&&<option value="">음식 선택</option>}
    {item.food&&!matches?.foods.some(f=>f.code===item.food?.code)&&<option value={item.food.code}>{item.food.name} · {item.food.servingAmount}{item.food.servingUnit}</option>}
    {matches?.foods.map(food=><option key={food.code} value={food.code}>{food.name}{food.brand?` (${food.brand})`:''} · {food.servingAmount}{food.servingUnit} · {food.kcal===null?'영양 미확인':`${Math.round(food.kcal)}kcal`}</option>)}
   </select></details>}
  {matches&&!matches.foods.length&&<small>일치하는 영양정보가 없어요. 이름을 고치거나 아래 버튼으로 미확인 상태로 남겨 주세요.</small>}
  {item.name.trim()&&<div className={styles.reviewDetails}><Button variant="ghost" disabled={locked} onClick={()=>{const food=manualFoodReference(`manual:${item.name.trim()}`);if(food)onChange({...item,food});}}>잘 모르겠어요 · 영양 미확인으로 남기기</Button></div>}
  <label htmlFor={`meal-amount-${item.id}`}>먹은 양 {item.food?(item.food.servingUnit==='회'?'· 1회분 기준':`· 1회 ${item.food.servingAmount}${item.food.servingUnit} 기준`):''}</label>
  <div className={styles.chips}>{[0.5,1,1.5,2].map(p=><Button key={p} variant={p===item.portions?'primary':'secondary'} disabled={locked} aria-pressed={p===item.portions} onClick={()=>onChange({...item,portions:p})}>{p}회</Button>)}</div>
  <input id={`meal-amount-${item.id}`} type="number" min="0.25" max="10" step="0.25" value={item.portions||''} disabled={locked} onChange={e=>onChange({...item,portions:Number(e.target.value)})}/>
  {!validPortions(item.portions)?<small role="alert">0.25~10회 사이에서 0.25 단위로 입력해 주세요.</small>:item.food&&<small>{Math.round(item.food.servingAmount*item.portions*100)/100}{item.food.servingUnit} · {item.food.kcal===null?'영양 미확인':`약 ${Math.round(item.food.kcal*item.portions)}kcal`}</small>}
  <Button variant="ghost" disabled={locked} aria-label={`음식 ${index+1} 삭제`} onClick={onRemove}>음식 삭제</Button>
 </li>;
}

export function PhotoMealReview({draft,initialFoods,onDraftChange,onSaved,onBusyChange}:{draft:MealDraft;initialFoods:PhotoFood[];onDraftChange:(draft:MealDraft)=>Promise<void>;onSaved:(result:PhotoMealSaved)=>void;onBusyChange:(busy:boolean)=>void}){
 const [items,setItems]=useState<PhotoMealItem[]>(()=>draft.photoItems??(initialFoods.length?initialFoods.map(food=>({id:crypto.randomUUID(),name:food.name.slice(0,40),originalName:food.name,food:null,portions:1})):[{id:crypto.randomUUID(),name:"",originalName:"",food:null,portions:1}]));
 const [time,setTime]=useState(()=>mealTimeLocal(draft.createdAt)),[slot,setSlot]=useState<MealSlot>(()=>draft.photoMealSlot??inferredMealSlot(draft.createdAt));
 const [saving,setSaving]=useState(false),[pending,setPending]=useState(draft.photoSavePending??false),[error,setError]=useState('');
 const submitting=useRef(false),persist=useRef(onDraftChange);
 const latestDraft=useRef(draft);
 useEffect(()=>{persist.current=onDraftChange;latestDraft.current=draft;},[onDraftChange,draft]);
 const iso=mealTimeISO(time),locked=saving||pending;
 const resolved=useCallback((id:string,name:string,food:FoodReference)=>setItems(list=>list.map(item=>item.id===id&&item.name===name&&!item.food?{...item,food}:item)),[]);
 useEffect(()=>{onBusyChange(locked);return()=>onBusyChange(false);},[locked,onBusyChange]);
 useEffect(()=>{
  if(locked)return;
  const timer=setTimeout(()=>{void persist.current({...latestDraft.current,photoItems:items,photoMealSlot:slot,createdAt:iso??latestDraft.current.createdAt}).catch(()=>setError('수정 내용을 임시 보관하지 못했어요. 이 화면에서 저장을 완료해 주세요.'));},200);
  return()=>clearTimeout(timer);
 },[items,slot,iso,locked]);
 const {ready,calories,missing,issues}=photoReviewState(items,iso);
 async function save(){
  if(!ready||submitting.current)return;submitting.current=true;setSaving(true);setError('');
  try{
   await persist.current({...latestDraft.current,photoItems:items,photoMealSlot:slot,createdAt:iso!,photoSavePending:true});
   setPending(true);
   const form=new FormData();form.set('id',draft.id);form.set('photo',draft.photo,'meal.jpg');form.set('eatenAt',iso!);form.set('mealSlot',slot);form.set('items',JSON.stringify(items.map(item=>({referenceCode:item.food!.code,portions:item.portions}))));
   const response=await fetch('/api/food-intake/confirmed-photo',{method:'POST',body:form,signal:AbortSignal.timeout(45_000)});
   const result=await response.json();
   if(!response.ok){
    if(response.status<500){await persist.current({...latestDraft.current,photoItems:items,photoMealSlot:slot,createdAt:iso!,photoSavePending:false});setPending(false);}
    throw Error(result.error??'한 끼를 저장하지 못했어요. 다시 시도해 주세요.');
   }
   trackAnalytics('meal_recorded',{method:'photo',outcome:'recorded',photo_count:1});
   window.dispatchEvent(new CustomEvent(INTAKE_LOGGED_EVENT));onSaved(result);
  }catch(e){setError(e instanceof Error?e.message:'저장 결과를 확인하지 못했어요. 다시 저장하면 중복 없이 확인해요.');}
  finally{submitting.current=false;setSaving(false);}
 }
 return <div className={styles.matches}>
  <h3>음식과 먹은 양을 확인해요</h3><p>틀린 이름은 고치고, 빠진 음식은 추가하세요. 양은 1회분으로 시작해요.</p>
  <fieldset disabled={locked} className={styles.mealReviewTime}><MealTimePicker value={time} slot={slot} onChange={setTime} onSlotChange={setSlot} disabled={locked}/></fieldset>
  <ol className={styles.foodReviewList}>{items.map((item,index)=><FoodRow key={item.id} item={item} index={index} locked={locked} onResolve={resolved} onChange={next=>setItems(list=>list.map(row=>row.id===next.id?next:row))} onRemove={()=>setItems(list=>list.filter(row=>row.id!==item.id))}/>)}</ol>
  <Button variant="secondary" disabled={locked||items.length>=10} onClick={()=>setItems(list=>[...list,{id:crypto.randomUUID(),name:'',originalName:'',food:null,portions:1}])}>+ 빠진 음식 추가</Button>
  <div className={styles.reviewSave}>
  <p>음식 {items.length}개 · {calories===null?'영양 미확인':`확인된 합계 약 ${calories}kcal`}</p>
  {missing>0&&<small>영양정보 미확인 {missing}개는 합계에 포함되지 않아요.</small>}
  {!ready&&<p role="status" id={`review-status-${draft.id}`}>{issues[0]?.message}</p>}
  {pending&&!saving&&<Notice>저장 결과 확인이 필요해요. 같은 내용으로 다시 시도하면 중복 없이 확인합니다.</Notice>}
  {error&&<Notice tone="error">{error}</Notice>}
  <Button block aria-describedby={!ready?`review-status-${draft.id}`:undefined} disabled={!ready||saving} onClick={()=>void save()}>{saving?'한 끼 저장 중…':pending?'저장 결과 다시 확인':`음식 ${items.length}개 함께 저장`}</Button>
  </div>
 </div>;
}
