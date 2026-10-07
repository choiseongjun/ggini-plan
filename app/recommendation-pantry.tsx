'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import type {PlanProduct} from '../lib/shopping-plan';
import {isPantrySeasoning} from '../lib/pantry-recommendation';
import {pantryForRecommendation,restorePantry} from '../lib/pantry-inventory';
import {pendingPantryKey,pendingPantrySelection,recommendationIngredients,rememberPantrySelection,saveRecommendationPantry} from '../lib/recommendation-pantry';
import {trackAnalytics} from '../lib/analytics';
import styles from './recommendation-pantry.module.css';

export function RecommendationPantry({product,userId,onLogin}:{product:PlanProduct;userId?:string;onLogin:()=>void}){
 const names=recommendationIngredients(product);
 const [selected,setSelected]=useState<string[]>([]),[touched,setTouched]=useState(false),[ready,setReady]=useState(false);
 const [busy,setBusy]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState('');
 const lock=useRef(false),root=useRef<HTMLElement>(null);
 const key=`ggini-recipe-pantry-${userId??'guest'}-${product.id}`;
 useEffect(()=>{
  let active=true;
  async function load(){
   let owned:string[]=[];
   try{
    if(userId){const r=await fetch('/api/pantry/inventory',{cache:'no-store',signal:AbortSignal.timeout(15000)});const d=await r.json();if(r.ok&&d.userId===userId)owned=pantryForRecommendation(restorePantry(d.inventory)).owned;}
    else {const d=JSON.parse(localStorage.getItem('kkiniplan-pantry-preview-guest')??'{}');owned=pantryForRecommendation(restorePantry(d.inventory)).owned;}
    const draft=JSON.parse(sessionStorage.getItem(key)??'null');
    if(Array.isArray(draft)&&draft.every(n=>typeof n==='string'))owned=draft;
   }catch{/* A failed preview never prevents manually selecting ingredients. */}
   if(active){setSelected(owned);setTouched(owned.length>0);setReady(true);}
  }
  void load();return()=>{active=false;};
 },[key,userId]);
 useEffect(()=>{
  const node=root.current;if(!node)return;
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){trackAnalytics('recommendation_pantry_viewed');observer.disconnect();}},{threshold:0.25});
  observer.observe(node);return()=>observer.disconnect();
 },[]);
 const chosen=names.filter(n=>selected.includes(n));
 const missing=names.filter(n=>!selected.includes(n));
 const main=names.filter(n=>!isPantrySeasoning(n)),seasonings=names.filter(isPantrySeasoning);
 function toggle(name:string){
  const next=selected.includes(name)?selected.filter(n=>n!==name):[...selected,name];
  setSelected(next);setTouched(true);setSaved(false);setError('');
  try{sessionStorage.setItem(key,JSON.stringify(next));}catch{}
  trackAnalytics('recommendation_pantry_selected');
 }
 async function save(){
  if(lock.current||!chosen.length)return;
  trackAnalytics('recommendation_pantry_save_clicked');setError('');
  if(!userId){
   try{rememberPantrySelection(chosen);}
   catch{setError('선택을 보관하지 못했어요. 브라우저의 저장 공간을 확인해 주세요.');return;}
   onLogin();return;
  }
  lock.current=true;setBusy(true);
  try{await saveRecommendationPantry(userId,chosen);setSaved(true);trackAnalytics('recommendation_pantry_saved');}
  catch(e){setError(e instanceof Error?e.message:'재료를 저장하지 못했어요.');trackAnalytics('recommendation_pantry_save_failed');}
  finally{lock.current=false;setBusy(false);}
 }
 const chips=(list:string[])=>list.map(name=><button type="button" key={name} aria-pressed={selected.includes(name)} disabled={!ready||busy} onClick={()=>toggle(name)}><span aria-hidden="true">{selected.includes(name)?'✓':'+'}</span>{name==='달걀'?'계란':name}</button>);
 if(!names.length)return null;
 return <section ref={root} className={styles.card} aria-label="추천 메뉴 재료 확인">
  <span className={styles.eyebrow}>이 메뉴, 집에 있는 재료로?</span>
  <h3>있는 재료만 톡톡 눌러주세요</h3>
  <p>없는 재료만 추려드릴게요.</p>
  <div className={styles.chips} role="group" aria-label="집에 있는 재료">{chips(main)}</div>
  {!!seasonings.length&&<details className={styles.seasonings}><summary>양념도 확인하기 · {seasonings.filter(n=>selected.includes(n)).length}/{seasonings.length}</summary><div className={styles.chips} role="group" aria-label="집에 있는 양념">{chips(seasonings)}</div></details>}
  {touched&&<div className={styles.result} role="status"><strong>{missing.length?`추가로 확인할 재료 ${missing.length}가지`:'재료 종류는 모두 있어요!'}</strong><p>{missing.length?missing.join(' · '):'레시피에서 필요한 양도 확인해 주세요.'}</p><small>등록된 이 메뉴의 재료 기준 · 양념 포함 · 보유 수량은 별도 확인</small></div>}
  {chosen.length>0&&!saved&&<><button className={styles.save} type="button" disabled={busy||!ready} onClick={()=>void save()}>{busy?'재료 기억하는 중…':userId?'내 재료에 추가하기':'내 재료 기억해 두기'}</button><small className={styles.note}>{userId?'선택한 재료만 추가해요. 기존 재료는 그대로 유지돼요.':'로그인하면 선택한 재료를 저장해요. 다음에는 ‘내 재료’에서 추천받으세요.'}</small></>}
  {saved&&<p className={styles.success} role="status">내 재료에 기억했어요. <Link href="/ingredients">이 재료로 다른 메뉴 추천받기 →</Link></p>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}

// Lives above the planner so login, refresh, and a different restored menu cannot lose the save intent.
export function PendingRecommendationPantry({userId}:{userId?:string}){
 const [state,setState]=useState<'idle'|'saving'|'saved'|'error'>('idle'),[error,setError]=useState('');
 const lock=useRef(false);
 const resume=useCallback(async()=>{
  const draft=pendingPantrySelection();if(!userId||!draft||lock.current)return;
  lock.current=true;setState('saving');
  try{
   await saveRecommendationPantry(userId,draft.names);
   try{sessionStorage.removeItem(pendingPantryKey);}catch{}
   setState('saved');trackAnalytics('recommendation_pantry_saved');
  }catch(e){setState('error');setError(e instanceof Error?e.message:'재료를 저장하지 못했어요.');trackAnalytics('recommendation_pantry_save_failed');}
  finally{lock.current=false;}
 },[userId]);
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)void resume();});return()=>{active=false;};},[resume]);
 if(state==='idle')return null;
 return <aside className={styles.card} aria-label="내 재료 저장 결과">
  {state==='saving'?<p role="status">선택한 재료를 내 재료에 추가하고 있어요…</p>:state==='saved'?<p role="status">선택한 재료를 기억했어요. <Link href="/ingredients">이 재료로 다른 메뉴 추천받기 →</Link></p>:<><p role="alert">{error}</p><button type="button" onClick={()=>void resume()}>재료 저장 다시 시도</button></>}
 </aside>;
}
