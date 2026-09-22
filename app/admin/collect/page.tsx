"use client";
import {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {AuthScreen} from '../../auth-screen';
import {OasisCollectionPanel} from '../oasis-collection-panel';
import {CoupangCollectionPanel} from '../coupang-collection-panel';
import {NutritionAIStatus} from '../nutrition-ai-status';
import {FoodSafetyNutritionPanel} from '../foodsafety-nutrition-panel';
import type {CatalogItem} from '../../../lib/catalog';
import type {ExtractedNutrition} from '../../../lib/nutrition-ocr';
import {readNutritionPhotos,nutritionFieldCount} from '../../../lib/nutrition-photo-selection';
import '../style.css';
import './style.css';

const fields = [['caloriesKcal','열량 (kcal)'],['proteinG','단백질 (g)'],['carbohydratesG','탄수화물 (g)'],['fatG','지방 (g)'],['sodiumMg','나트륨 (mg)']] as const;
type Result = {id: string; name: string; extracted?: ExtractedNutrition; text?: string; warning?: string; sourceUrl?: string; images?: string[]; imageUrl?: string; version?: string; error?: string; saveError?:string; saved?: boolean; estimate?:CatalogItem['nutritionEstimate'];checkedImages?:number; fillNotice?:string};
const canSave=(result:Result)=>!result.saved&&!result.error&&Boolean(result.sourceUrl&&result.version&&result.extracted?.nutritionBasis?.trim())&&fields.every(([key])=>{const value=result.extracted?.[key];return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100000;});
export default function CollectionPage() {
  const router = useRouter();
  const [items,setItems] = useState<CatalogItem[]>([]), [loaded,setLoaded] = useState(false), [login,setLogin] = useState(false), [attempt,setAttempt] = useState(0), [error,setError] = useState('');
  const [seller,setSeller] = useState('all'), [count,setCount] = useState('10'), [busy,setBusy] = useState(false), [results,setResults] = useState<Result[]>([]), [status,setStatus] = useState('');
  const [estimateMissing,setEstimateMissing]=useState(true);
  const [batchSaving,setBatchSaving]=useState(false);
  const saveable=results.filter(canSave);
  const stop = useRef(false);
  useEffect(() => () => {stop.current = true;}, []);
  useEffect(() => {
    let active = true;
    fetch('/api/admin/catalog', {cache:'no-store'}).then(async r => {
      if (r.status === 401 || r.status === 403) {if(active)setLogin(true); return;}
      const data = await r.json(); if (!r.ok) throw new Error(data.error);
      if (active) {setItems(data.items);setLogin(false);setLoaded(true);setError('');}
    }).catch(e => {if(active)setError(e.message);});
    return () => {active = false;};
  }, [attempt]);
  const candidates = items.filter(i => i.market === 'KR' && /^https:\/\/www\.(kurly\.com\/goods|oasis\.co\.kr\/product\/detail)\/\d+$/.test(i.productUrl ?? '') && (seller === 'all' || i.productUrl?.includes(seller)) && (!i.nutritionBasis || fields.some(([key]) => i[key] === null)));
  async function read(item: {id:string; name:string}, imageIndex?: number): Promise<Result> {
    async function requestPhoto(index?:number):Promise<Result> {
      const r=await fetch('/api/admin/catalog/nutrition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,imageIndex:index})});
      const data=await r.json();if(!r.ok){if(r.status===502||r.status===401||r.status===403)stop.current=true;throw new Error(data.error);}return {...data,id:item.id,name:item.name};
    }
    try {
      let result:Result=imageIndex===undefined?await readNutritionPhotos(requestPhoto,(index,total)=>setStatus(`${item.name} · 표시사항 사진 ${index}/${total} 읽는 중…`)):await requestPhoto(imageIndex);
      if(estimateMissing&&nutritionFieldCount(result)<5){
        setStatus(`${item.name} · 없는 영양값 추정 중…`);
        const response=await fetch('/api/admin/catalog/nutrition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,mode:'estimate',known:result.extracted})});
        const data=await response.json();if(!response.ok)throw new Error(data.error);
        result={...result,...data};
      }
      const count=nutritionFieldCount(result);
      return {...result,fillNotice:count?`영양 수치 ${count}/5개를 아래 입력칸에 자동 입력했습니다. 기준량을 확인한 뒤 저장하세요.`:'등록된 사진에서 입력 가능한 영양 수치를 찾지 못했습니다.'};
    }
    catch(e) {return {...item,error:e instanceof Error?e.message:'수집 실패'};}
  }
  async function collect() {
    const limit = Number(count);
    if(!Number.isInteger(limit)||limit<1||limit>100){setError('1~100개 사이로 입력해 주세요.');return;}
    setBusy(true);stop.current=false;setError('');
    const queue = candidates.filter(item=>!results.some(result=>result.id===item.id)).slice(0,limit);
    try {for(let index=0;index<queue.length&&!stop.current;index++) {setStatus(`${index+1}/${queue.length}개 영양정보 읽는 중…`);const result=await read(queue[index]);setResults(prev=>[...prev,result]);}
      setStatus(stop.current?'중지했습니다. 읽은 결과는 아래에서 확인하세요.':'읽기를 마쳤습니다. 원문과 수치를 확인한 상품만 저장해 주세요.');
    } finally {setBusy(false);}
  }
  async function persist(result:Result) {
    const r=await fetch('/api/admin/catalog/nutrition',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:result.id,extracted:result.extracted,sourceUrl:result.sourceUrl,version:result.version,estimate:result.estimate})});
    const data=await r.json();
    if(!r.ok){const message=data.error??'저장 실패';setResults(prev=>prev.map(v=>v.id===result.id?{...v,saveError:message}:v));return {ok:false,status:r.status};}
    setResults(prev=>prev.map(v=>v.id===result.id?{...v,saved:true,saveError:undefined}:v));return {ok:true,status:r.status};
  }
  async function save(result: Result) {
    setBusy(true);setError('');
    try {if((await persist(result)).ok)setAttempt(v=>v+1);}
    catch(e){setError(e instanceof Error?e.message:'저장 실패');}finally{setBusy(false);}
  }
  async function saveAll(){
    if(busy||!saveable.length)return;
    const queue=[...saveable];let success=0,failed=0,processed=0;stop.current=false;
    setBusy(true);setBatchSaving(true);setError('');
    try {
      for(const result of queue){
        if(stop.current)break;
        setStatus(`영양정보 일괄 저장 중 ${processed+1}/${queue.length}개 · ${result.name}`);
        try {const saved=await persist(result);processed++;if(saved.ok)success++;else{failed++;if(saved.status===401||saved.status===403)break;}}
        catch {processed++;failed++;setResults(prev=>prev.map(v=>v.id===result.id?{...v,saveError:'연결 문제로 저장 여부를 확인하지 못했습니다. 다시 읽은 뒤 저장해 주세요.'}:v));}
      }
      setStatus(`일괄 저장 완료 · 성공 ${success}개 · 실패 ${failed}개${processed<queue.length?` · 미처리 ${queue.length-processed}개`:''}`);
      if(success)setAttempt(v=>v+1);
    }finally{setBusy(false);setBatchSaving(false);}
  }
  if(login)return <main className="admin-login-shell"><AuthScreen admin initialError={error} onExplore={()=>router.push('/')} onSuccess={()=>{setError('');setAttempt(v=>v+1);}}/></main>;
  return <main className="admin-shell"><header className="admin-header"><div><span className="admin-kicker">KKINIPLAN · CONTENT MANAGER</span><h1>상품 수집</h1><p>판매 상품을 등록하고, 원문 영양정보를 읽어 확인 후 저장해요.</p></div><Link href="/">앱으로 돌아가기 ↗</Link></header>
    <nav className="admin-collection-tabs" aria-label="상품 관리 메뉴"><Link href="/admin">상품·영양 관리</Link><Link href="/admin/collect" aria-current="page">상품 수집</Link><Link href="/admin/deals">핫딜 수집·관리</Link><Link href="/admin/foodsafety">영양DB 조회</Link><Link href="/admin/recipe-optimizer">유사 레시피 생성기</Link></nav>
    {error&&<p role="alert">{error}</p>}{!loaded?<p>관리자 권한과 상품을 확인하고 있어요. {error&&<button onClick={()=>setAttempt(v=>v+1)}>다시 시도</button>}</p>:<>
    <OasisCollectionPanel onCollected={()=>setAttempt(v=>v+1)}/>
    <CoupangCollectionPanel onCollected={()=>setAttempt(v=>v+1)}/>
    <FoodSafetyNutritionPanel items={items} onApplied={()=>setAttempt(v=>v+1)}/>
    <NutritionAIStatus/><label><input type="checkbox" checked={estimateMissing} disabled={busy} onChange={e=>setEstimateMissing(e.target.checked)}/> 영양표에 없는 값은 AI 추정으로 채우기 (추정 표시 후 저장)</label>
    <section className="oasis-collection"><h2>영양성분 수집</h2><small>등록된 한국 상품 중 영양 수치가 비어 있는 상품을 확인합니다. 컬리·오아시스의 영양정보 원문과 표시사항 사진을 읽어요. 첫 사진에서 수치를 찾지 못하면 다음 사진도 자동으로 읽어 입력칸을 채웁니다. 화면을 유지해 주세요. 표가 없거나 인식이 어려운 상품은 직접 입력이 필요합니다.</small>
      <div className="catalog-collection-controls"><label>영양정보 판매처<select disabled={busy} value={seller} onChange={e=>setSeller(e.target.value)}><option value="all">지원 판매처 전체</option><option value="kurly.com">컬리</option><option value="oasis.co.kr">오아시스</option></select></label><label>읽을 상품 수<input type="number" min="1" max="100" disabled={busy} value={count} onChange={e=>setCount(e.target.value)}/></label><p>미입력·일부 입력 {candidates.length}개</p></div>
      <button disabled={busy||!candidates.some(item=>!results.some(result=>result.id===item.id))} onClick={collect}>{results.length?'다음 미입력 상품 영양성분 읽기':'미입력 상품 영양성분 읽기'}</button>{busy&&!batchSaving&&<button onClick={()=>{stop.current=true;setStatus('현재 상품을 읽은 후 중지합니다.');}}>수집 중지</button>}<p role="status">{status}</p>
      <small>읽기만으로 기존 데이터가 바뀌지는 않습니다. 아래에서 기준량·수치를 확인하고 저장하면 상품 영양정보에 반영됩니다.</small>
    </section>
    <section className="oasis-collection" aria-label="영양정보 일괄 저장"><h2>읽은 영양정보 저장</h2><p>저장 가능 {saveable.length}개 · 추정 포함 {saveable.filter(r=>r.estimate).length}개 · 저장 완료 {results.filter(r=>r.saved).length}개</p><button type="button" disabled={busy||!saveable.length} onClick={saveAll}>{batchSaving?'일괄 저장 중…':`영양정보 ${saveable.length}개 일괄 저장`}</button><small>현재 화면에서 기준량과 5가지 영양값이 모두 채워진 미저장 상품을 저장합니다. 추정 표시도 함께 저장하며, 실패한 상품은 아래에 이유를 표시합니다.</small></section>
    <div className="nutrition-results">{results.map(result=><article key={result.id}><h3>{result.name}</h3>{result.sourceUrl&&<a href={result.sourceUrl} target="_blank" rel="noopener noreferrer">판매처 원문 확인 ↗</a>}{result.error&&<p role="alert">{result.error}</p>}{result.saveError&&<p role="alert">저장 실패: {result.saveError}</p>}{result.fillNotice&&<p role="status">{result.fillNotice}{result.checkedImages?` (사진 ${result.checkedImages}장 확인)`:''}</p>}{result.estimate&&<p><strong>추정 영양정보</strong> · {result.estimate.note}</p>}{result.warning&&<p>{result.warning}</p>}
      <button disabled={busy||result.saved} onClick={async()=>{setBusy(true);try{const next=await read(result);setResults(prev=>prev.map(v=>v.id===result.id?next:v));setStatus(next.error??next.fillNotice??'읽기를 마쳤습니다.');}finally{setBusy(false);}}}>사진 자동 확인 후 다시 입력</button>{result.extracted&&<><div className="nutrition-result-fields"><label>영양 기준량<input disabled={busy||result.saved} value={result.extracted.nutritionBasis??''} maxLength={80} onChange={e=>setResults(prev=>prev.map(v=>v.id===result.id?{...v,extracted:{...v.extracted!,nutritionBasis:e.target.value}}:v))}/></label>{fields.map(([key,label])=><label key={key}>{label}{result.estimate?.fields.includes(key)?' · 추정':''}<input type="number" min="0" max="100000" step="any" disabled={busy||result.saved} value={result.extracted![key]??''} onChange={e=>setResults(prev=>prev.map(v=>v.id===result.id?{...v,extracted:{...v.extracted!,[key]:e.target.value===''?null:Number(e.target.value)}}:v))}/></label>)}</div>
      {!!result.images?.length&&<div className="nutrition-image-links">{result.images.map((url,index)=><span key={url}><a href={url} target="_blank" rel="noopener noreferrer">표시사항 사진 {index+1} ↗</a><button disabled={busy||result.saved} onClick={async()=>{setBusy(true);setStatus(`${result.name} · 사진 ${index+1} 읽고 입력하는 중…`);try{const next=await read(result,index);setResults(prev=>prev.map(v=>v.id===result.id?next:v));setStatus(next.error??next.fillNotice??'읽기를 마쳤습니다.');}finally{setBusy(false);}}}>이 사진 읽고 자동 입력</button></span>)}</div>}
      <details><summary>인식 원문 보기</summary><pre>{result.text||'읽을 수 있는 영양정보 원문이 없습니다.'}</pre></details><button disabled={busy||!canSave(result)} onClick={()=>save(result)}>{result.saved?'저장 완료':result.estimate?'추정 표시와 함께 저장':'확인한 영양성분 저장'}</button></>}
      <Link href={`/admin?item=${encodeURIComponent(result.id)}`}>상품 관리에서 직접 입력 →</Link></article>)}</div></>}
  </main>;
}
