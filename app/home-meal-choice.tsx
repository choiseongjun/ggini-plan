'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import products from '../data/convenience-preview.json';
import './home-meal-choice.css';

function ComboDialog({label,onClose,children}:{label:string;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
 return <dialog ref={ref} className="combo-dialog" aria-label={label} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>{children}</dialog>;
}

export function HomeMealChoice({initialOpen=false}:{initialOpen?:boolean}){
 const [open,setOpen]=useState(initialOpen);
 const [brand,setBrand]=useState('CU');
 const [budget,setBudget]=useState(6000);
 const [offset,setOffset]=useState(0);
 const [failedImages,setFailedImages]=useState<string[]>([]);
 const [replacement,setReplacement]=useState<number|null>(null);
 const [custom,setCustom]=useState<string[]|null>(null);
 const [recordOpen,setRecordOpen]=useState(false);
 const [slot,setSlot]=useState('점심');
 const [recorded,setRecorded]=useState(false);
 const [recordError,setRecordError]=useState('');
 const stock=products.filter(p=>p.price!==null&&p.price>0&&p.image&&!failedImages.includes(p.id)&&p.brand===brand);
 const side=(p:typeof products[number])=>/^(샐\))|미니햄감자샐러드컵|미니감자마카로니컵/.test(p.name);
 const complete=(p:typeof products[number])=>!side(p)&&(/^(도|면)\)|도시락|비빔밥/.test(p.name));
 const combinations=stock.filter(p=>!side(p)&&!p.name.includes('우유크림')).flatMap(p=>{
  if(complete(p))return p.price!<=budget?[[p]]:[];
  return stock.filter(q=>side(q)&&p.price!+q.price!<=budget).map(q=>[p,q]);
 });
 const base=combinations.length?combinations[offset%combinations.length]:[];
 const picked=custom?custom.map(id=>stock.find(p=>p.id===id)).filter((p):p is typeof stock[number]=>!!p):base;
 const total=picked.reduce((n,p)=>n+p.price!,0);
 const alternatives=replacement===null?[]:stock.filter(p=>!picked.some(q=>q.id===p.id)&&total-picked[replacement].price!+p.price!<=budget&&(picked.length===1?complete(p):side(p)===side(picked[replacement])));
 function reset(){setOffset(0);setCustom(null);setReplacement(null);setRecorded(false);}
 function savePreview(){try{const key='kkini-convenience-preview-records';const previous=JSON.parse(localStorage.getItem(key)||'[]');localStorage.setItem(key,JSON.stringify([...(Array.isArray(previous)?previous:[]),{at:new Date().toISOString(),slot,brand,items:picked.map(p=>({id:p.id,name:p.name,price:p.price})),total}]));setRecorded(true);setRecordOpen(false);}catch{setRecordError('저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.');}}
 return <section className="meal-choice meal-fallback" aria-label="요리가 어려운 날의 대안">
  {!initialOpen&&<button type="button" className="meal-fallback-toggle" aria-expanded={open} onClick={()=>setOpen(value=>!value)}><span>편의점 한 끼 찾기</span><span aria-hidden="true">{open?'−':'＋'}</span></button>}
  {open&&<div className="home-convenience"><div className="home-convenience-title"><h2>그럼 간편하게 챙겨요</h2><span>편의점과 한 끼 예산만 골라주세요.</span></div>
   <div className="home-store-controls"><div aria-label="편의점 선택">{['CU','GS25','세븐일레븐'].map(b=><button key={b} type="button" aria-pressed={brand===b} onClick={()=>{setBrand(b);reset();}}>{b}</button>)}</div><select aria-label="한 끼 총 예산" value={budget} onChange={e=>{setBudget(Number(e.target.value));reset();}}>{[4000,6000,8000,10000].map(n=><option key={n} value={n}>{n.toLocaleString()}원 이하</option>)}</select></div>
   {picked.length>0?<article className="meal-combo"><div className="meal-combo-heading"><span>{brand} · 오늘의 한 끼</span><strong>합계 {total.toLocaleString()}원</strong></div><h3>{picked.length===1?'도시락·식사 메뉴 하나로 간편하게':'메인에 곁들임을 더했어요'}</h3><p className="combo-reason">{picked.length===1?'추가 상품 없이 예산 안에서 골랐어요.':'같은 편의점에서 살 수 있는 메인과 샐러드 조합이에요.'}</p><div className="combo-items">{picked.map((p,i)=><div className="combo-item" key={p.id}><img src={p.image!} alt={p.name} onError={()=>{setFailedImages(ids=>[...ids,p.id]);reset();}}/><div><small>{picked.length===1?'한 끼 메뉴':i===0?'메인':'곁들임'} · 1개</small><h4>{p.name.replace(/^(?:도|면|샌|샐|그린|삼립|롯데)\)/,'')}</h4><strong>{p.price!.toLocaleString()}원</strong><a href={p.url} target="_blank" rel="noopener noreferrer">상품 출처 ↗</a></div><button type="button" onClick={()=>setReplacement(i)}>교체</button></div>)}</div><div className="combo-actions"><button type="button" disabled={combinations.length<2} onClick={()=>{setOffset(n=>n+1);setCustom(null);setRecorded(false);}}>다른 조합 ↻</button><button type="button" onClick={()=>{setRecordError('');setRecordOpen(true);}}>{recorded?'기록 확인하기':'이렇게 먹었어요'}</button></div>{recorded&&<p role="status">체험 기록을 이 브라우저에 저장했어요.</p>}</article>:<p className="combo-empty">이 편의점에서 예산에 맞는 한 끼 구성을 아직 찾지 못했어요. 편의점이나 예산을 바꿔주세요.</p>}
   <p className="home-products-note">공식 공개 자료 가격 기준 · 매장 가격·재고는 다를 수 있어요. 영양정보가 없어 영양 맞춤 추천은 적용하지 않았어요.</p>
  </div>}
  {replacement!==null&&<ComboDialog label="상품 교체" onClose={()=>setReplacement(null)}><header><h2>이 상품만 바꿔볼까요?</h2><button autoFocus type="button" onClick={()=>setReplacement(null)} aria-label="닫기">✕</button></header><p>합계 {budget.toLocaleString()}원 안에서 골랐어요.</p>{alternatives.length?alternatives.map(p=><button className="combo-alternative" type="button" key={p.id} onClick={()=>{setCustom(picked.map((q,i)=>i===replacement?p.id:q.id));setReplacement(null);setRecorded(false);}}>{p.name}<strong>{p.price!.toLocaleString()}원</strong></button>):<p>현재 예산에서 교체할 상품이 없어요.</p>}</ComboDialog>}
  {recordOpen&&<ComboDialog label="먹은 음식 확인" onClose={()=>setRecordOpen(false)}><header><h2>이렇게 드셨나요?</h2><button autoFocus type="button" aria-label="닫기" onClick={()=>setRecordOpen(false)}>✕</button></header><p>{picked.map(p=>p.name).join(' + ')}</p><label>먹은 끼니 <select value={slot} onChange={e=>setSlot(e.target.value)}>{['아침','점심','저녁','간식'].map(s=><option key={s}>{s}</option>)}</select></label><p className="home-products-note">현재는 체험 기록이에요. 이 브라우저에만 저장되며 실제 식사 기록·영양 통계에는 반영되지 않아요.</p>{recordError&&<p role="alert">{recordError}</p>}<button className="combo-save" type="button" disabled={recorded} onClick={savePreview}>{recorded?'체험 기록 저장 완료':'체험 기록 저장'}</button></ComboDialog>}

 </section>;
}
