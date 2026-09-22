"use client";
import {useEffect,useMemo,useState} from 'react';
import type {CatalogItem} from '../../lib/catalog';
type Match={foodCode:string;name:string;makerName:string;servingSize:string;servingUnit:string;caloriesKcal:number|null;carbohydratesG:number|null;proteinG:number|null;fatG:number|null;sodiumMg:number|null;datasetLabel?:string;sampleCount?:number};
const complete=(m:Match)=>[m.caloriesKcal,m.carbohydratesG,m.proteinG,m.fatG,m.sodiumMg].every(v=>typeof v==='number');
export function FoodSafetyNutritionPanel({items,onApplied}:{items:CatalogItem[];onApplied:()=>void}){
 const missing=useMemo(()=>items.filter(i=>!i.nutritionBasis),[items]);
 const [apiConfigured,setApiConfigured]=useState<boolean|null>(null),[localCount,setLocalCount]=useState<number|null>(null),[checkAttempt,setCheckAttempt]=useState(0);
 const [selectedId,setSelectedId]=useState('');
 const [keyword,setKeyword]=useState('');
 const [matches,setMatches]=useState<Match[]>([]);
 const [busy,setBusy]=useState(false),[applyingCode,setApplyingCode]=useState(''),[appliedCodes,setAppliedCodes]=useState<Set<string>>(new Set());
 const [error,setError]=useState(''),[status,setStatus]=useState('');
 useEffect(()=>{
  let active=true;
  fetch('/api/admin/catalog/foodsafety',{cache:'no-store'}).then(async r=>{const data=await r.json();if(active&&r.ok){setApiConfigured(Boolean(data.apiConfigured));setLocalCount(Number(data.localCount)||0);}}).catch(()=>{});
  return()=>{active=false;};
 },[checkAttempt]);
 const effectiveId=selectedId||missing[0]?.id||'';
 const selected=items.find(i=>i.id===effectiveId)??null;
 const effectiveKeyword=keyword||selected?.name||'';
 function selectItem(id:string){setSelectedId(id);setKeyword(items.find(i=>i.id===id)?.name??'');}
 async function search(){
  if(!effectiveKeyword.trim()){setError('검색어를 입력해 주세요.');return;}
  setBusy(true);setError('');setStatus('');setMatches([]);setAppliedCodes(new Set());
  try{
   const r=await fetch('/api/admin/catalog/foodsafety',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({keyword:effectiveKeyword.trim()})});
   const data=await r.json();if(!r.ok)throw new Error(data.error);
   setMatches(data.matches);if(!data.matches.length)setStatus('검색 결과가 없어요. 다른 검색어로 시도해 주세요.');
  }catch(e){setError(e instanceof Error?e.message:'검색 실패');}finally{setBusy(false);}
 }
 async function apply(match:Match){
  if(!selected){setError('적용할 상품을 선택해 주세요.');return;}
  setApplyingCode(match.foodCode);setError('');
  try{
   const r=await fetch('/api/admin/catalog/nutrition',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    id:selected.id,version:selected.updatedAt,govSource:true,
    sourceUrl:'https://various.foodsafetykorea.go.kr/nutrient/',
    govSourceName:`식약처 식품영양성분DB · ${match.name}${match.makerName?` (${match.makerName})`:''} 참고 · 실제 상품과 다를 수 있음`,
    extracted:{nutritionBasis:`${match.servingSize}${match.servingUnit}`||'1회 제공량',caloriesKcal:match.caloriesKcal,proteinG:match.proteinG,carbohydratesG:match.carbohydratesG,fatG:match.fatG,sodiumMg:match.sodiumMg},
   })});
   const data=await r.json();if(!r.ok)throw new Error(data.error);
   setAppliedCodes(prev=>new Set(prev).add(match.foodCode));setStatus(`${selected.name}에 영양정보를 적용했어요.`);onApplied();
  }catch(e){setError(e instanceof Error?e.message:'적용 실패');}finally{setApplyingCode('');}
 }
 const canSearch=(localCount??0)>0||Boolean(apiConfigured);
 return <section className="oasis-collection">
  <div><h2>🏛️ 식약처 식품영양성분DB 매칭</h2><small>로컬에 저장된 공공DB 스냅샷(가공식품·음식 {localCount??'…'}건){apiConfigured?' + 실시간 API':''}에서 이름으로 검색해 영양정보가 비어 있는 상품에 참고값을 채워 넣습니다. 실제 판매 상품과 수치가 다를 수 있어 참고용으로 표시돼요.</small></div>
  {apiConfigured===false&&<details><summary>실시간 API도 함께 검색하려면</summary><p>로컬은 <code>.env.local</code>, 배포 사이트는 Vercel의 Environment Variables에 <code>FOODSAFETY_API_KEY</code>를 추가하세요 (식품안전나라 데이터활용서비스에서 자동 승인 발급). 로컬 스냅샷만으로도 검색·적용은 이미 가능해요.</p><button type="button" onClick={()=>setCheckAttempt(v=>v+1)}>설정 상태 다시 확인</button></details>}
  <div className="catalog-collection-controls">
   <label>대상 상품 (영양정보 미입력 {missing.length}개)<select disabled={busy} value={effectiveId} onChange={e=>selectItem(e.target.value)}>{!missing.length&&<option value="">대상 상품 없음</option>}{missing.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
   <label>검색어<input disabled={busy} type="text" maxLength={60} value={effectiveKeyword} onChange={e=>setKeyword(e.target.value)}/></label>
  </div>
  <button type="button" disabled={busy||!canSearch||!effectiveId} onClick={search}>{busy?'검색 중…':'영양성분DB 검색'}</button>
  {error&&<p role="alert">{error}</p>}
  <div role="status">{status}</div>
  {matches.length>0&&<ul className="foodsafety-matches">{matches.map(m=><li key={m.foodCode}>
   <strong>{m.name}</strong><span> · {m.datasetLabel??'API'}</span>{m.makerName&&<span> · {m.makerName}</span>}<span> · {m.servingSize}{m.servingUnit} 기준</span>{(m.sampleCount??1)>1&&<span> · 표본 {m.sampleCount}건 평균</span>}
   <small>{complete(m)?`열량 ${m.caloriesKcal}kcal · 탄수 ${m.carbohydratesG}g · 단백 ${m.proteinG}g · 지방 ${m.fatG}g · 나트륨 ${m.sodiumMg}mg`:'일부 영양값이 없어 적용할 수 없어요.'}</small>
   <button type="button" disabled={!complete(m)||!!applyingCode||appliedCodes.has(m.foodCode)} onClick={()=>apply(m)}>{appliedCodes.has(m.foodCode)?'적용 완료':applyingCode===m.foodCode?'적용 중…':'이 상품에 적용'}</button>
  </li>)}</ul>}
 </section>;
}
