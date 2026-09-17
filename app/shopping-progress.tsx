'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Checkbox} from './components/checkbox';
import {changeStock,parseStock,remainingQuantity,type ShoppingStock,type StockAction,type StockChange} from '../lib/shopping-progress';
import './shopping-progress.css';
import {importGuestStock,withGuestStockLock} from '../lib/guest-shopping-progress';
import {validStockQuantity} from '../lib/food-intake';

export function useShoppingProgress(userId:string|undefined,scope:'products'|'ingredients'){
 const [stock,setStock]=useState<ShoppingStock>({}),[version,setVersion]=useState(0),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 const lock=useRef(false);
 const key=`kkiniplan-progress-${scope}-${userId??'guest'}`,endpoint=`/api/shopping-progress?scope=${scope}`;
 useEffect(()=>{
  const c=new AbortController();
  (async()=>{
   try{
    if(userId)await importGuestStock(userId);
    if(c.signal.aborted)return;
    const data=userId?await fetch(endpoint,{cache:'no-store',signal:c.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);return d;}):JSON.parse(localStorage.getItem(key)??'{"stock":{},"version":0}');
    const parsed=parseStock(data.stock);if(!parsed)throw new Error('저장된 구매 목록을 읽지 못했어요.');
    if(!c.signal.aborted){setStock(parsed);setVersion(data.version);setReady(true);}
   }catch(e){if(!c.signal.aborted)setError(e instanceof Error?e.message:'구매 목록을 불러오지 못했어요.');}
  })();return()=>c.abort();
 },[key,userId,endpoint,revision]);
 useEffect(()=>{const changed=(event:Event)=>{const detail=(event as CustomEvent).detail;if(detail?.scope===scope&&detail?.source==='intake'){setReady(false);setRevision(n=>n+1);}};window.addEventListener('shopping-progress-changed',changed);return()=>window.removeEventListener('shopping-progress-changed',changed);},[scope]);
 async function update(changes:StockChange[],action:StockAction){
  if(lock.current||!ready)return false;lock.current=true;setBusy(true);setError('');
  try{
   const next=changeStock(stock,changes,action);let data={stock:next,version:version+1};
   if(userId){const r=await fetch(endpoint,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({stock:next,version})});const d=await r.json();if(!r.ok){setReady(false);throw new Error(d.error);}data=d;}
   else await withGuestStockLock(async()=>{const previous=JSON.parse(localStorage.getItem(key)??'{"version":0}');if(previous.importId)throw new Error('로그인한 계정으로 목록을 옮기는 중이에요. 해당 계정에서 다시 불러와 주세요.');if(previous.version!==version){setReady(false);throw new Error('다른 화면에서 목록이 변경됐어요. 다시 불러와 주세요.');}localStorage.setItem(key,JSON.stringify(data));});
   setStock(data.stock);setVersion(data.version);window.dispatchEvent(new CustomEvent('shopping-progress-changed',{detail:{scope,source:'cart'}}));return true;
  }catch(e){setError(e instanceof Error?e.message:'구매 상태를 저장하지 못했어요.');return false;}
  finally{lock.current=false;setBusy(false);}
 }
 return {scope,stock,ready,busy,error,update,reload:()=>{setReady(false);setError('');setRevision(n=>n+1);}};
}
export type PurchaseItem={id:string;name:string;unit:string;required:number;url:string|null;price:number|null;packSize?:number;detail?:string;thumbnail?:ReactNode;recommendation?:ReactNode};
type Progress=ReturnType<typeof useShoppingProgress>;
const labels={plan:'추천 메뉴',buy:'살 것',ordered:'주문한 것',owned:'보유 재료'};
function seller(url:string|null){try{return url?new URL(url).hostname.replace(/^www\./,''):'판매처 미연결';}catch{return '판매처 미연결';}}
export function ShoppingProgress({items,progress,guest=false,recommended=false,summary,heading}:{items:PurchaseItem[];progress:Progress;guest?:boolean;recommended?:boolean;summary?:ReactNode;heading?:ReactNode}){
 const [tab,setTab]=useState<keyof typeof labels>(recommended?'plan':'buy'),[selected,setSelected]=useState<string[]>([]),[checkout,setCheckout]=useState(false),[message,setMessage]=useState('');
 const checkoutRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(checkout)checkoutRef.current?.scrollIntoView({behavior:'smooth',block:'start'});},[checkout]);
 const [quantities,setQuantities]=useState<Record<string,number>>({});
 const {stock,ready,busy,error}=progress;
 const merged=new Map<string,PurchaseItem>();
 for(const i of items){const prev=merged.get(i.id);merged.set(i.id,prev?{...prev,required:prev.required+i.required}:i);}
 const all:PurchaseItem[]=[...merged.values(),...Object.values(stock).filter(i=>!merged.has(i.id)&&(i.ordered||i.owned)).map(i=>({...i,required:0,price:null}))];
 const buying=tab==='buy'||tab==='plan';
 const tabs: (keyof typeof labels)[]=recommended?['plan','ordered','owned']:['buy','ordered','owned'];
 const quantity=(i:PurchaseItem,t=tab)=>(t==='buy'||t==='plan')?remainingQuantity(i.required,stock[i.id]):t==='ordered'?(stock[i.id]?.ordered??0):(stock[i.id]?.owned??0);
 const rows=tab==='plan'?[...merged.values()]:all.filter(i=>quantity(i)>0),selectable=rows.filter(i=>quantity(i)>0),chosen=selectable.filter(i=>selected.includes(i.id));
 const defaultQuantity=(i:PurchaseItem)=>buying?Math.ceil(quantity(i)/(i.packSize??1))*(i.packSize??1):quantity(i);
 const chosenQuantity=(i:PurchaseItem)=>quantities[i.id]??defaultQuantity(i);
 const invalidQuantity=(i:PurchaseItem)=>!validStockQuantity(chosenQuantity(i))||chosenQuantity(i)<=0||chosenQuantity(i)>(buying?10000000:quantity(i));
 const count=(t:keyof typeof labels)=>t==='plan'?merged.size:all.filter(i=>quantity(i,t)>0).length;
 const cost=(i:PurchaseItem,q:number)=>Math.ceil(q/(i.packSize??1))*(i.price??0);
 const total=all.reduce((sum,i)=>sum+cost(i,remainingQuantity(i.required,stock[i.id])),0);
 const unknown=all.some(i=>remainingQuantity(i.required,stock[i.id])>0&&i.price===null);
 const groups=new Map<string,PurchaseItem[]>();for(const i of chosen){const name=seller(i.url);groups.set(name,[...(groups.get(name)??[]),i]);}
 async function act(action:StockAction){
  const ok=await progress.update(chosen.map(i=>({item:{id:i.id,name:i.name,unit:i.unit,url:i.url},quantity:chosenQuantity(i)})),action);
  if(ok){setSelected([]);setCheckout(false);setQuantities({});setMessage(action==='receive'||action==='buy'?'보유 재료에 반영했어요.':action==='order'?'주문한 목록으로 옮겼어요. 배송받으면 ‘받았어요’를 눌러 주세요.':action==='cancel'?'주문 표시를 취소했어요. 실제 주문 취소는 판매처에서 해 주세요.':action==='consume'?'사용한 수량을 보유 재료에서 뺐어요.':'보유 수량을 반영했어요.');}
 }
 return <section className={`purchase-progress${recommended?' purchase-recommended':''}`} aria-label="구매와 보유 상태 관리">
  {summary??<div className="purchase-summary"><span>앞으로 살 것</span><strong>{total.toLocaleString('ko-KR')}원{unknown?' + 미확인 금액':''}</strong><small>등록 가격 기준 · 배송비 별도</small></div>}
  {heading}
  <p className="body-note">{guest?'이 브라우저에 구매 상태를 저장해요. 로그인하면 주문·보유 목록을 계정에 합쳐요.':'구매 상태는 계정에 자동 저장해요.'} 주문·보유 수량은 다음 구매 목록에서도 반영돼요.</p>
  <nav className="purchase-tabs" aria-label="구매 상태">{tabs.map(t=><button type="button" key={t} aria-pressed={tab===t} onClick={()=>{setTab(t);setSelected([]);setCheckout(false);setQuantities({});setMessage('');}}>{labels[t]} <b>{count(t)}</b></button>)}</nav>
  {error&&<p role="alert">{error} <button type="button" disabled={busy} onClick={progress.reload}>다시 불러오기</button></p>}
  {!ready&&!error&&<p role="status">구매 상태를 불러오는 중…</p>}
  {ready&&<>
   {!rows.length?<p className="purchase-empty">{buying?'지금 추가로 살 것이 없어요. 주문·보유 목록을 확인해 주세요.':tab==='ordered'?'아직 주문 표시한 상품이 없어요.':'받았어요 또는 이미 있어요로 보유 재료를 등록해 보세요.'}</p>:<>
    <label className="purchase-select-all"><Checkbox disabled={busy||!selectable.length} checked={selectable.length>0&&chosen.length===selectable.length} onChange={e=>setSelected(e.target.checked?selectable.map(i=>i.id):[])}/>{recommended&&buying?'살 것 모두 선택':'전체 선택'} ({selectable.length})</label>
    <div className="purchase-items">{rows.map(i=><article key={i.id}>
     <label className="purchase-item-heading"><Checkbox disabled={busy||quantity(i)===0} checked={chosen.some(c=>c.id===i.id)} onChange={e=>setSelected(prev=>e.target.checked?[...prev,i.id]:prev.filter(id=>id!==i.id))}/>{i.thumbnail}<strong>{i.name}</strong></label>
     {i.recommendation}
     <div className="purchase-stock-summary">
     {recommended&&<span className="purchase-stock-title"><span aria-hidden="true">🧺</span> {buying?'장보기는 한 번에':tab==='ordered'?'주문한 수량':'우리 집에 있어요'}</span>}
     <p className="purchase-item-status">{buying&&quantity(i)===0?'추가 구매 없이 준비됐어요':recommended&&buying?`추가 구매 ${defaultQuantity(i).toLocaleString('ko-KR')}${i.unit}${i.price!==null?' · '+cost(i,quantity(i)).toLocaleString('ko-KR')+'원':''}`:`${quantity(i).toLocaleString('ko-KR')}${i.unit}${buying?' 더 필요해요':tab==='ordered'?' 주문했어요':' 있어요'}`}</p>
     {tab==='plan'&&((stock[i.id]?.ordered??0)>0||(stock[i.id]?.owned??0)>0)&&<small>주문 {stock[i.id]?.ordered??0}{i.unit} · 보유 {stock[i.id]?.owned??0}{i.unit}</small>}
     {i.detail&&<small>{i.detail}</small>}{!recommended&&buying&&quantity(i)>0&&i.packSize&&<small>판매 묶음에 맞춰 {defaultQuantity(i).toLocaleString('ko-KR')}{i.unit} 구매 기준이에요.</small>}
     {!recommended&&buying&&i.price!==null&&<b>추가 구매 {cost(i,quantity(i)).toLocaleString('ko-KR')}원</b>}
     {buying&&<small>{seller(i.url)}</small>}
     </div>
     {chosen.some(c=>c.id===i.id)&&<label className="purchase-quantity">처리할 수량<input aria-label={`${i.name} 처리할 수량`} type="number" min={0.000001} max={buying?10000000:quantity(i)} step="any" disabled={busy} value={quantities[i.id]??defaultQuantity(i)} onChange={e=>setQuantities(v=>({...v,[i.id]:Number(e.target.value)}))}/>{i.unit}</label>}
    </article>)}</div>
    <fieldset className="purchase-actions" disabled={busy||!chosen.length||chosen.some(invalidQuantity)}><legend>선택한 {chosen.length}종 처리</legend>
     {buying?<><button type="button" className="primary-button" onClick={()=>setCheckout(true)}>선택한 {chosen.length}종 구매하러 가기 →</button><button type="button" onClick={()=>void act('buy')}>직접 샀어요</button><button type="button" onClick={()=>void act('have')}>이미 있어요</button><button type="button" onClick={()=>void act('order')}>주문했어요</button></>:tab==='ordered'?<><button type="button" className="primary-button" onClick={()=>void act('receive')}>받았어요 → 보유 재료로</button><button type="button" onClick={()=>void act('cancel')}>주문 표시 취소</button></>:<button type="button" onClick={()=>void act('consume')}>사용했어요 / 보유 수량에서 빼기</button>}
    </fieldset>
   </>}
   {checkout&&chosen.length>0&&<div ref={checkoutRef} className="purchase-checkout"><h3>판매처별로 구매하기</h3><p>목록을 복사하고 판매처에서 수량을 맞춰 담아 주세요.</p><p>선택한 수량 예상 {chosen.reduce((sum,i)=>sum+cost(i,chosenQuantity(i)),0).toLocaleString('ko-KR')}원{chosen.some(i=>i.price===null)?' + 미확인 금액':''} · 배송비 별도</p><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(chosen.map(i=>`${i.name} ${chosenQuantity(i)}${i.unit}${i.url?' '+i.url:''}`).join('\n'));setMessage('선택한 구매 목록을 복사했어요.');}catch{setMessage('목록을 복사하지 못했어요. 아래 상품과 수량을 확인해 주세요.');}}}>선택한 구매 목록 복사</button>
    {[...groups].map(([name,group])=><div key={name}><h4>{name}</h4>{group.map(i=><p key={i.id}>{i.url?<a href={i.url} target="_blank" rel="noopener noreferrer">{i.name} ↗</a>:i.name} · {chosenQuantity(i)}{i.unit}</p>)}</div>)}
    <p>선택한 상품을 주문했나요? 일부만 주문했다면 위에서 선택과 수량을 바꿔 주세요.</p><button type="button" className="primary-button" disabled={busy||chosen.some(invalidQuantity)} onClick={()=>void act('order')}>선택한 상품 주문했어요</button><button type="button" onClick={()=>setCheckout(false)}>나중에 할게요</button><small>결제와 배송은 판매처에서 진행해요. 주문·배송 상태는 직접 표시해 주세요.</small>
   </div>}
   <p className="body-note">{progress.scope==='products'?<>홈에서 ‘먹었어요’를 누르면 영양 기록과 수량 차감을 함께 처리해요. 버리거나 다른 용도로 쓴 수량은 보유 목록에서 빼 주세요. <Link href="/">먹은 음식 기록하기 →</Link></>:<>먹거나 사용한 재료는 보유 목록에서 수량을 빼 주세요. 직접 요리 재료는 아직 식사 기록과 자동 연결하지 않아요.</>}</p>
  </>}
  {message&&<p role="status">{message}</p>}
 </section>;
}
