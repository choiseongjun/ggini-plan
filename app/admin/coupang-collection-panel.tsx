"use client";
import {useEffect,useState} from 'react';
import {collectionCategories,type CollectionCategory} from '../../lib/catalog-sellers';
type Result={name:string;status:string;price?:number;message?:string};
export function CoupangCollectionPanel({onCollected}:{onCollected:()=>void}){
 const [configured,setConfigured]=useState<boolean|null>(null);
 const [checkAttempt,setCheckAttempt]=useState(0);
 const [keyword,setKeyword]=useState(''),[category,setCategory]=useState<CollectionCategory>('tofu'),[count,setCount]=useState('20');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[results,setResults]=useState<Result[]>([]),[summary,setSummary]=useState('');
 useEffect(()=>{
  let active=true;
  fetch('/api/admin/catalog/coupang',{cache:'no-store'}).then(async r=>{const data=await r.json();if(active&&r.ok)setConfigured(Boolean(data.configured));}).catch(()=>{});
  return()=>{active=false;};
 },[checkAttempt]);
 async function collect(){
  const target=Number(count);
  if(!keyword.trim()){setError('검색어를 입력해 주세요.');return;}
  if(!Number.isInteger(target)||target<1||target>100){setError('1~100 사이의 정수를 입력해 주세요.');return;}
  setBusy(true);setError('');setResults([]);setSummary('');
  try{
   const response=await fetch('/api/admin/catalog/coupang',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({keyword:keyword.trim(),category,count:target})});
   const data=await response.json();if(!response.ok)throw new Error(data.error);
   setResults(data.results);setSummary(`검색 결과 ${data.total}개 중 처리 완료.`);onCollected();
  }catch(e){setError(e instanceof Error?e.message:'수집 실패');}finally{setBusy(false);}
 }
 return <section className="oasis-collection">
  <div><h2>🛒 쿠팡 파트너스 상품 수집</h2><small>검색어와 카테고리를 고르면 쿠팡 파트너스 API로 상품을 찾아 등록·갱신합니다. 영양정보는 임의로 채우지 않아요.</small></div>
  {configured===false&&<details open><summary>API 키 설정 방법</summary><p>로컬은 <code>.env.local</code>, 배포 사이트는 Vercel의 Environment Variables에 <code>COUPANG_ACCESS_KEY</code>, <code>COUPANG_SECRET_KEY</code>를 추가하세요 (쿠팡 파트너스 &gt; 오픈 API 발급). 로컬 서버 재시작 또는 재배포 후 적용됩니다.</p><button type="button" onClick={()=>setCheckAttempt(v=>v+1)}>설정 상태 다시 확인</button></details>}
  <div className="catalog-collection-controls">
   <label>검색어<input disabled={busy} type="text" maxLength={60} placeholder="예: 닭가슴살" value={keyword} onChange={e=>setKeyword(e.target.value)}/></label>
   <label>수집 카테고리<select disabled={busy} value={category} onChange={e=>setCategory(e.target.value as CollectionCategory)}>{Object.entries(collectionCategories).map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>
   <label>가져올 상품 수<input disabled={busy} type="number" min="1" max="100" step="1" value={count} onChange={e=>setCount(e.target.value)}/></label>
  </div>
  <small>선택한 카테고리와 이름이 맞지 않는 상품, 가격·이미지·링크 확인이 안 된 상품은 건너뜁니다. 검색은 한 번에 최대 100개까지 가져와요.</small>
  <button type="button" disabled={busy||configured===false} onClick={collect}>{busy?'수집 중…':'쿠팡 상품 수집 시작'}</button>
  {error&&<p role="alert">{error}</p>}
  <div role="status">{summary}{results.length>0&&<p>확인 {results.length}개 · 신규 {results.filter(r=>r.status==='inserted').length}개 · 갱신 {results.filter(r=>r.status==='updated').length}개 · 건너뜀 {results.filter(r=>r.status==='skipped').length}개</p>}</div>
  {results.length>0&&<details><summary>상품별 수집 결과 보기</summary><ul>{results.map((r,i)=><li key={i}>{r.name} — {r.status==='skipped'?r.message:`${r.status==='inserted'?'신규 등록':'갱신'} · ${r.price?.toLocaleString()}원`}</li>)}</ul></details>}
 </section>;
}
