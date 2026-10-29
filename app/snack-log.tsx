'use client';


import {MealTimePicker,type MealTimeSelection} from './meal-time-picker';
import {mealTimeISO,mealTimeLocal,validEatenAt,recordDestinationTo,inferredMealSlot,type MealSlot} from '../lib/meal-time';
import {useEffect, useRef, useState} from 'react';
import type {FoodReference} from '../lib/food-reference';
import {DetailedNutrition} from './detailed-nutrition';
import {trackAnalytics} from '../lib/analytics';
import {trackPlanner} from '../lib/track-planner';
import {INTAKE_LOGGED_EVENT} from './record-progress';
import './snack-log.css';
import {MealPhotoLog} from './meal-photo-log';
import {validPortions} from '../lib/food-intake';
import {hasCachedFoodSearch,searchFoods} from '../lib/food-search-client';
import {manualFoodReference} from '../lib/basic-food-reference';
import type {RecordTiming} from '../lib/record-intent';
import type {MealDraft} from '../lib/meal-draft';

const portionsList = [[0.25, '¼배'], [0.5, '½배'], [1, '1배'], [1.5, '1.5배'], [2, '2배']] as const;
const n = (v: number) => Math.round(v).toLocaleString('ko-KR');
const serving = (f: FoodReference) => `${n(f.servingAmount)}${f.servingUnit}`;

// 간식·디저트·음료·외식 기록: 이름으로 찾아 한 번에 남긴다. 기록이 쌓일수록 하루 섭취량(칼로리·당류)이 정확해진다.
export function SnackLog({onLogged,initialOpen=false,photo=false,onClose,onBusyChange,initialFood=null,timeSelection,draft,onDraftChange,onRequireLogin,initialPortions=1,initialTiming}: {initialTiming?:RecordTiming;onRequireLogin?:(food:FoodReference,portions:number,timing:RecordTiming)=>void;initialPortions?:number;draft?:MealDraft|null;onDraftChange?:(draft:MealDraft)=>Promise<void>;timeSelection?:MealTimeSelection;initialFood?:FoodReference|null;onLogged: (name:string,eatenAt?:string,result?:{ids:string[];nutrition?:Record<string,number|null>;mealSlot?:MealSlot}) => void;initialOpen?:boolean;photo?:boolean;onClose?:()=>void;onBusyChange?:(busy:boolean)=>void}) {
 const [localMealTime,setLocalMealTime]=useState(()=>initialTiming?mealTimeLocal(initialTiming.eatenAt):draft?mealTimeLocal(draft.createdAt):'');
 const [localMealSlot,setLocalMealSlot]=useState<MealSlot|null>(()=>initialTiming?.mealSlot??inferredMealSlot(draft?.createdAt??new Date().toISOString()));
 const mealTime=timeSelection?.value??localMealTime,mealSlot=timeSelection?timeSelection.slot:localMealSlot;
 const setMealTime=timeSelection?.onChange??setLocalMealTime,setMealSlot=timeSelection?.onSlotChange??setLocalMealSlot;
 const timeISO=mealTime?mealTimeISO(mealTime):undefined;
 const timeValid=!mealTime||!!timeISO&&validEatenAt(timeISO);
 const [open, setOpen] = useState(initialOpen);
 const [query, setQuery] = useState('');
 const [results, setResults] = useState<{q: string; items: FoodReference[]} | null>(null);
 const [recent, setRecent] = useState<FoodReference[]>([]);
 const [picked, setPicked] = useState<FoodReference | null>(initialFood);
 const [portions, setPortions] = useState(draft?.portions??initialPortions);
 const [rememberedPortions,setRememberedPortions]=useState<Record<string,number>>({});
 const [photoUrl,setPhotoUrl]=useState('');
 const requestId=useRef<string|null>(draft?.id??null),submitting=useRef(false);
 useEffect(()=>{if(!draft?.photo)return;const url=URL.createObjectURL(draft.photo);const frame=requestAnimationFrame(()=>setPhotoUrl(url));return()=>{cancelAnimationFrame(frame);URL.revokeObjectURL(url);};},[draft?.photo]);
 const [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState('');
 useEffect(()=>{
  if(!draft||!picked||!validPortions(portions)||busy)return;
  const occurred=timeISO??draft.createdAt;
  if(draft.food?.code===picked.code&&draft.portions===portions&&draft.createdAt===occurred)return;
  const timer=window.setTimeout(()=>{void onDraftChange?.({...draft,food:picked,portions,createdAt:occurred}).catch(()=>setError('수정 내용을 임시 보관하지 못했어요. 화면을 닫기 전에 다시 저장해 주세요.'));},200);
  return()=>window.clearTimeout(timer);
 },[draft,picked,portions,timeISO,busy,onDraftChange]);
 useEffect(()=>{onBusyChange?.(busy);},[busy,onBusyChange]);
 const input = useRef<HTMLInputElement>(null);
 const recentVersion=useRef(0);
 const [recentLoading,setRecentLoading]=useState(true);
 const [searchError,setSearchError]=useState('');

 useEffect(() => {
  let alive=true;
  const version=recentVersion.current;
  fetch('/api/food-reference?recent=1',{cache:'no-store'})
   .then(async response=>{if(!response.ok)throw Error();return response.json();})
   .then(data=>{if(alive&&version===recentVersion.current){setRecent(data.items??[]);setRememberedPortions(data.portions??{});}})
   .catch(()=>{})
   .finally(()=>{if(alive)setRecentLoading(false);});
  return()=>{alive=false;};
 },[]);
 useEffect(()=>{if(open&&!initialFood)input.current?.focus();},[open,initialFood]);
 const q = query.trim();
 useEffect(() => {
  if (!q) return;
  let active=true;
  const timer=window.setTimeout(()=>{
   searchFoods(q).then(data=>{if(active){setResults({q,items:data.items});setSearchError('');}})
    .catch(()=>{if(active){setResults({q,items:[]});setSearchError('검색을 불러오지 못했어요. 이름 그대로 기록할 수도 있어요.');}});
  },hasCachedFoodSearch(q)?0:150);
  return()=>{window.clearTimeout(timer);active=false;};
 },[q]);
 function remember(food:FoodReference){
  recentVersion.current++;
  setRecent(items=>[food,...items.filter(item=>item.code!==food.code)].slice(0,8));
 }

 async function log(amount=portions) {
  if (!picked || !validPortions(amount)||!timeValid||!mealSlot||submitting.current) return;
  if(onRequireLogin){trackAnalytics('record_login_required',{method:'search'});onRequireLogin(picked,amount,{eatenAt:timeISO??new Date().toISOString(),mealSlot});return;}
  trackAnalytics('record_save_started',{method:draft?'photo':'search'});
  submitting.current=true;
  setBusy(true); setError('');
  try {
   requestId.current??=crypto.randomUUID();
   let r:Response;
   if(draft){
    await onDraftChange?.({...draft,food:picked,portions:amount,createdAt:timeISO??draft.createdAt});
    const form=new FormData();form.set('id',requestId.current);form.set('referenceCode',picked.code);form.set('portions',String(amount));form.set('mealSlot',mealSlot);form.set('eatenAt',timeISO??draft.createdAt);form.set('photo',draft.photo,'meal.jpg');
    r=await fetch('/api/food-intake/confirmed-photo',{method:'POST',body:form});
   }else r=await fetch('/api/food-intake', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'log', id: requestId.current, version: 0, mealSlot, referenceCode: picked.code, portions:amount,...(timeISO?{eatenAt:timeISO}:{})})});
   const d = await r.json();
   if (!r.ok) throw new Error(d.error);
   const savedName=d.food?.name??picked.name;
   setDone(d.replayed?'이미 저장된 식사를 확인했어요.':`${savedName} 기록했어요${picked.kcal !== null ? ` · 약 ${n(picked.kcal * amount)}kcal` : ''}`);
   remember(picked);
   setRememberedPortions(values=>({...values,[picked.code]:amount}));requestId.current=null;
   setPicked(null); setQuery(''); setResults(null); setPortions(1);
   if(!d.replayed)trackAnalytics('meal_recorded',{method:draft?'photo':'search'});
   trackPlanner('snack_logged');
   window.dispatchEvent(new CustomEvent(INTAKE_LOGGED_EVENT));
   setMealTime('');setMealSlot(inferredMealSlot(new Date().toISOString()));onLogged(savedName,d.eatenAt,d);
  } catch (e) { trackAnalytics('record_save_failed',{method:draft?'photo':'search'});setError(e instanceof Error ? e.message : '기록하지 못했어요.'); } finally { submitting.current=false;setBusy(false); }
 }

 if (!open) return <div className="snack-log-entry">
  <button type="button" className="snack-log-open" onClick={() => { setOpen(true); setDone(''); }}>간식·음료·외식도 기록하기</button>
  {done && <p className="snack-log-done" role="status">{done}</p>}
 </div>;

 const list = q ? (results?.q === q ? results.items : null) : recent;
 return <section className="snack-log" aria-label="간식·음료·외식 기록">
  <header><strong>무엇을 먹었어요?</strong><button type="button" aria-label="닫기" disabled={busy} onClick={() => { setOpen(false); setPicked(null); setQuery(''); onClose?.(); }}>
   <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
  {!timeSelection&&<MealTimePicker value={mealTime} slot={mealSlot} onSlotChange={setMealSlot} onChange={setMealTime} disabled={busy}/>}
  {draft&&<div><p className="snack-log-note">보관한 사진과 함께 저장해요. 음식과 분량을 확인해 주세요.</p>
   {/* eslint-disable-next-line @next/next/no-img-element -- device-local preview */}
   <img src={photoUrl||undefined} alt="임시 보관한 식사" style={{width:'100%',maxHeight:'12rem',objectFit:'contain'}}/>
   <small>최종 저장 시 사진을 내 식사 일기에 업로드해요. AI 사진 분석은 동의 후 서버에서 처리해요.</small></div>}
  {photo&&<p className="snack-log-note">음식을 고른 뒤 사진을 올리면 먹은 양을 추정해요. 올린 사진은 식사 기록에 함께 보관돼요.</p>}
  {!picked&&<input ref={input} type="search" value={query} placeholder="예: 카페라떼, 치즈케이크, 스타벅스, 순대국밥" aria-label="음식 이름 검색" maxLength={40} disabled={busy} onChange={(e) => { setQuery(e.target.value); setPicked(null);setSearchError('');setDone(''); }}/>}
  {!picked&&!q&&recentLoading&&!recent.length&&<p className="snack-log-note" role="status">최근 기록을 불러오는 중이에요. 음식 이름을 바로 검색할 수 있어요.</p>}
  {!picked&&!q && recent.length > 0 && <span className="snack-log-label">최근에 기록한 것</span>}
  {q && list === null && <p className="snack-log-note">찾고 있어요…</p>}
  {q&&searchError&&<p role="alert" className="snack-log-note">{searchError}</p>}
  {q&&!picked&&<div className="snack-log-manual"><button type="button" disabled={busy} onClick={()=>{const food=manualFoodReference(`manual:${q}`);if(food){setPicked(food);setPortions(1);}}}>목록에 없나요? ‘{q}’ 그대로 기록하기</button><small>이름과 먹은 양을 저장해요. 영양정보는 미확인으로 표시해요.</small></div>}
  {!picked && list && list.length > 0 && <ul className="snack-log-list">{list.map((f) => <li key={f.code}>
   <button type="button" disabled={busy} onClick={() => { setPicked(f); setPortions(validPortions(rememberedPortions[f.code])?rememberedPortions[f.code]:1); }}>
    <span><strong>{f.name}</strong>{f.brand && <small>{f.brand}</small>}</span>
    <span className="snack-log-meta">{serving(f)}{f.kcal !== null && ` · ${n(f.kcal)}kcal`}{f.sugar !== null && f.sugar >= 1 && ` · 당류 ${n(f.sugar)}g`}</span>
   </button>
  </li>)}</ul>}
  {picked && <div className="snack-log-pick">
   <p><strong>{picked.name}</strong>{picked.brand && <small> {picked.brand}</small>}<span>기준량 {serving(picked)} · 한 개·한 조각과 다를 수 있어요</span></p>
   {validPortions(rememberedPortions[picked.code])&&<p className="snack-log-note">지난번에는 {rememberedPortions[picked.code]}회분으로 기록했어요. 오늘 먹은 양에 맞게 바꿔 주세요.</p>}
   {photo&&<MealPhotoLog key={picked.code} referenceCode={picked.code} dishName={picked.name} disabled={busy} onManual={()=>void log()} onFallback={()=>void log(1)} onLogged={()=>{remember(picked);setPicked(null);setQuery('');setDone('사진으로 식사를 기록했어요. 아래에서 양을 수정할 수 있어요.');window.dispatchEvent(new CustomEvent(INTAKE_LOGGED_EVENT));onLogged(picked.name);}}/>}
   <div className="snack-log-portions" role="radiogroup" aria-label="먹은 양">{portionsList.map(([value, label]) => <button type="button" role="radio" key={value} aria-checked={portions === value} onClick={() => setPortions(value)}>{label}</button>)}</div>
   <label className="snack-log-custom">기준량의 몇 배를 먹었나요?<input type="number" min="0.25" max="10" step="0.25" aria-label="먹은 양 직접 입력" value={portions||''} disabled={busy} onChange={e=>setPortions(Number(e.target.value))}/>배</label>
   {validPortions(portions)&&<p className="snack-log-note">선택한 양 {Math.round(picked.servingAmount*portions*10)/10}{picked.servingUnit} · 조각 수나 인분 수가 아닌 기준량의 배수예요.</p>}
   <p className="snack-log-total" aria-live="polite">{!validPortions(portions)?'먹은 양을 0.25~10회, 0.25 단위로 입력해 주세요.':<>{picked.kcal !== null ? <>약 <b>{n(picked.kcal * portions)}</b>kcal</> : '칼로리 정보 없음'}{picked.sugar !== null && ` · 당류 ${n(picked.sugar * portions)}g`}{picked.sodium !== null && ` · 나트륨 ${n(picked.sodium * portions)}mg`}</>}</p>
   <DetailedNutrition code={picked.code} amount={validPortions(portions) ? picked.servingAmount * portions : 0} unit={picked.servingUnit}/>
   <div className="snack-log-actions"><button type="button" onClick={() => setPicked(null)}>다시 고르기</button><button type="button" className="snack-log-submit" disabled={busy||!validPortions(portions)||!timeValid||!mealSlot} onClick={() => void log()}>{busy ? '기록 중…' : onRequireLogin?'로그인하고 이 식사 저장':`${recordDestinationTo(mealTime,mealSlot)} 기록`}</button></div>
  </div>}
  {done&&<p className="snack-log-done" role="status">{done}</p>}
  {error && <p className="snack-log-error" role="alert">{error}</p>}
  <small className="snack-log-foot">출처: 식품영양성분 데이터베이스 · Korean Food Composition Database system(K-FCDB). 직접 입력한 음식은 영양정보가 미확인으로 남고 합계에서 제외돼요.</small>
 </section>;
}
