'use client';
import {useEffect,useRef,useState} from 'react';
import {Button,Notice} from './components/ui';
import {mealTimeLocal,mealTimeISO,validEatenAt,inferredMealSlot,mealSlots,mealSlotLabels,type MealSlot} from '../lib/meal-time';
import {validPortions} from '../lib/food-intake';
import {trackAnalytics} from '../lib/analytics';
import {readPendingMealReuse,rememberMealReuse,clearPendingMealReuse,type MealReuseRequest} from '../lib/pending-meal-reuse';
import {INTAKE_LOGGED_EVENT} from './record-progress';
import styles from './recent-meal-reuse.module.css';
type Meal={id:string;date:string;items:{id:string;name:string;portions:number}[]};

export function RecentMealReuse(){
 const [open,setOpen]=useState(false),[meals,setMeals]=useState<Meal[]>([]),[selected,setSelected]=useState<Meal|null>(null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[done,setDone]=useState(false);
 const [owner,setOwner]=useState<string|null>(null),[uncertain,setUncertain]=useState(false),[revision,setRevision]=useState(0);
 const [time,setTime]=useState(()=>mealTimeLocal()),[slot,setSlot]=useState<MealSlot>(()=>inferredMealSlot(new Date().toISOString()));
 const pending=useRef<MealReuseRequest|null>(null),submitting=useRef(false);
 useEffect(()=>{
  if(!open)return;
  const controller=new AbortController();let alive=true;
  fetch('/api/food-intake/reuse',{cache:'no-store',signal:controller.signal}).then(async response=>{
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'최근 식사를 불러오지 못했어요.');
   if(typeof data.ownerId!=='string'||!Array.isArray(data.meals))throw new Error('계정과 최근 식사를 다시 확인해 주세요.');
   const previous=readPendingMealReuse(localStorage,data.ownerId);
   if(!alive)return;
   setOwner(data.ownerId);setMeals(data.meals);pending.current=previous;setUncertain(!!previous);
   if(previous){
    const source:Meal|undefined=data.meals.find((meal:Meal)=>meal.id===previous.source);
    setSelected({id:previous.source,date:previous.eatenAt,items:previous.items.map((item,i)=>({...item,name:source?.items.find(row=>row.id===item.id)?.name??`음식 ${i+1}`}))});
    setTime(mealTimeLocal(previous.eatenAt));setSlot(previous.mealSlot);setDone(false);
   }else{setSelected(null);}
  }).catch(e=>{if(alive){setOwner(null);setError(e instanceof Error?e.message:'최근 식사를 불러오지 못했어요.');}}).finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false;controller.abort();};
 },[open,revision]);

 const eatenAt=mealTimeISO(time);
 const invalid=!selected?.items.length?'남길 음식을 하나 이상 선택해 주세요.':!selected.items.every(item=>validPortions(item.portions))?'먹은 양은 0.25~10회분 사이에서 0.25 단위로 입력해 주세요.':!eatenAt||!validEatenAt(eatenAt)?'먹은 시간을 확인해 주세요. 미래 식사는 기록할 수 없어요.':'';
 async function save(){
  if(submitting.current||!owner||!selected||(!pending.current&&invalid))return;
  submitting.current=true;setBusy(true);setError('');
  const request=pending.current??{id:crypto.randomUUID(),owner,source:selected.id,items:selected.items.map(({id,portions})=>({id,portions})),eatenAt:eatenAt!,mealSlot:slot};
  try{rememberMealReuse(localStorage,request);pending.current=request;setUncertain(true);}
  catch{setError('저장 확인 정보를 보관하지 못했어요. 기기의 저장 공간을 확인한 뒤 최근 식사를 다시 열어 주세요.');submitting.current=false;setBusy(false);return;}
  let failure:'timeout'|'network'|'server'|'rejected'='network';
  try{
   const response=await fetch('/api/food-intake/reuse',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(30000)});
   failure=response.status>=500||response.ok?'server':'rejected';
   const data=await response.json();
   if(!response.ok){
    // Auth expiry and ambiguous failures keep the original request across login/app restart.
    if([400,404,409,422].includes(response.status)){clearPendingMealReuse(localStorage,owner,request.id);pending.current=null;setUncertain(false);}
    throw new Error(data.error||'저장 결과를 확인하지 못했어요.');
   }
   if(data.saved!==true||!Array.isArray(data.ids)||!data.ids.length)throw new Error('저장 결과를 확인하지 못했어요. 같은 요청으로 다시 확인해 주세요.');
   clearPendingMealReuse(localStorage,owner,request.id);pending.current=null;
   setUncertain(false);setSelected(null);setDone(true);
   trackAnalytics('meal_reuse_saved',{method:'reuse',replayed:data.replayed===true});
   if(data.replayed!==true)trackAnalytics('meal_recorded',{method:'reuse'});
   window.dispatchEvent(new CustomEvent(INTAKE_LOGGED_EVENT));setLoading(true);setRevision(value=>value+1);
  }catch(e){
   if(e instanceof Error&&e.name==='TimeoutError')failure='timeout';
   const message=failure==='timeout'?'응답이 늦어 저장 결과를 확인하지 못했어요. 같은 요청으로 다시 확인해 주세요.':e instanceof TypeError?'연결이 끊겨 저장 결과를 확인하지 못했어요. 같은 요청으로 다시 확인해 주세요.':e instanceof SyntaxError?'저장 응답을 읽지 못했어요. 같은 요청으로 다시 확인해 주세요.':e instanceof Error?e.message:'저장 결과를 확인하지 못했어요.';
   setUncertain(!!pending.current);setError(message);
   trackAnalytics('meal_reuse_failed',{method:'reuse',failure});
  }finally{submitting.current=false;setBusy(false);}
 }
 return <details className={styles.fold} onToggle={e=>{const next=e.currentTarget.open;setOpen(next);if(next){setLoading(true);setError('');trackAnalytics('meal_reuse_opened',{method:'reuse'});}}}>
  <summary>한 끼 통째로 다시 기록 <span>최근 식사</span></summary>
  {error&&<Notice tone="error">{error}{!owner&&<Button variant="secondary" onClick={()=>{setError('');setLoading(true);setRevision(n=>n+1);}}>다시 불러오기</Button>}</Notice>}
  {done&&<p role="status">새 식사로 저장했어요.</p>}
  {loading?<p role="status">최근 식사를 불러오고 있어요…</p>:!selected?<div className={styles.matches}>
   {!error&&!meals.length&&<p>한 끼를 저장하면 다음부터 여기서 불러올 수 있어요.</p>}
   {owner&&meals.map(meal=><Button key={meal.id} variant="secondary" onClick={()=>{setSelected(structuredClone(meal));setTime(mealTimeLocal());setSlot(inferredMealSlot(new Date().toISOString()));setError('');setDone(false);trackAnalytics('meal_reuse_selected',{method:'reuse'});}}>{mealTimeLocal(meal.date).slice(5,10)} · {meal.items.map(item=>item.name).join(' · ')}</Button>)}
  </div>:<div className={styles.editor}>
   {uncertain?<Notice tone="info">앞선 저장 결과를 먼저 확인해 주세요. 같은 요청으로 확인하므로 중복 저장되지 않아요.</Notice>:<p className={styles.help}>오늘 먹은 양을 확인하세요. 지난번 영양정보를 사용하며 사진은 복사하지 않아요.</p>}
   <fieldset disabled={busy||uncertain||!owner} className={styles.fields}>
    {selected.items.map(item=><div className={styles.item} key={item.id}>
     <label>{item.name}<span className={styles.amount}><input aria-label={`${item.name} 먹은 양`} type="number" inputMode="decimal" min="0.25" max="10" step="0.25" value={item.portions||''} onChange={e=>setSelected({...selected,items:selected.items.map(row=>row.id===item.id?{...row,portions:Number(e.target.value)}:row)})}/><span>회분</span></span></label>
     <Button variant="ghost" aria-label={`${item.name} 빼기`} onClick={()=>setSelected({...selected,items:selected.items.filter(row=>row.id!==item.id)})}>빼기</Button>
    </div>)}
    <label>먹은 시간 <input type="datetime-local" value={time} onChange={e=>setTime(e.target.value)}/></label>
    <label>끼니 <select value={slot} onChange={e=>setSlot(e.target.value as MealSlot)}>{mealSlots.map(value=><option key={value} value={value}>{mealSlotLabels[value]}</option>)}</select></label>
   </fieldset>
   {!uncertain&&invalid&&<p role="status">{invalid}</p>}
   <Button disabled={busy||!owner||(!uncertain&&!!invalid)} onClick={()=>void save()}>{busy?'저장 중…':uncertain?'같은 요청으로 저장 확인':'한 끼 저장'}</Button>
   {!uncertain&&<Button variant="ghost" disabled={busy} onClick={()=>setSelected(null)}>다른 식사 선택</Button>}
  </div>}
 </details>;
}
