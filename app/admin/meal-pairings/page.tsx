'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import type {Pairing,Template} from '../../../lib/meal-pairings';
import '../style.css';
import '../menus/menus.css';
import './pairings.css';
type Row=Pairing&{id:string;mainName:string;mainRole:string;companionName:string;available:boolean;reviewed_by?:string;preview:null|{name:string;price:number;minutes:number;hasRice:boolean;nutrition:{calories:number|null;protein:number|null};ingredients:string[]}};
const scoreLabels:Record<string,string>={role:'구성 역할',mild:'매운맛 보완',vegetable:'채소 곁들임',reuse:'재료 공유'};
const relationLabels={pairing:'함께 먹기',substitute:'대체 메뉴',avoid_pairing:'함께 추천 금지'};
const states={suggested:'검토 대기',approved:'추천에 사용',excluded:'제외'};
export default function Pairings(){
 const dialogRef=useRef<HTMLDialogElement>(null);
 const moreRef=useRef<HTMLDivElement>(null);
 const [category,setCategory]=useState('all'),[mainRole,setMainRole]=useState('all');
 const [snapshots,setSnapshots]=useState<{id:string;createdAt:string;meals:{name:string;price:number;composition:null|{items:{role:string;reason:string}[]}}[]}[]|null>(null);
 async function showSnapshots(){try{const r=await fetch('/api/admin/meal-pairings?snapshots=1');const d=await r.json();if(!r.ok)throw Error(d.error);setSnapshots(d.snapshots);}catch{setError('추천 기록을 불러오지 못했어요.');}}
 const roleName:Record<string,string>={main:'메인',staple:'주식',side:'곁들임',salad:'샐러드',drink:'음료',sauce:'소스'};
 const [history,setHistory]=useState<{created_at:string;before_data:Row;after_data:Row}[]>([]);

 const [rows,setRows]=useState<Row[]>([]),[configs,setConfigs]=useState<Template[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[query,setQuery]=useState(''),[status,setStatus]=useState('all'),[shown,setShown]=useState(24),[editing,setEditing]=useState<Row|null>(null);
 async function load(){try{const r=await fetch('/api/admin/meal-pairings');const d=await r.json();if(!r.ok)throw Error(d.error);setRows(d.relations);setConfigs(d.templates);}catch(e){setError(e instanceof Error?e.message:'불러오기 실패');}finally{setLoading(false);}}
 useEffect(()=>{
 const controller=new AbortController();
 fetch('/api/admin/meal-pairings',{signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error);return data;}).then(data=>{setRows(data.relations);setConfigs(data.templates);setLoading(false);}).catch(e=>{if(!controller.signal.aborted){setError(e.message);setLoading(false);}});
 return ()=>controller.abort();
 },[]);
 useEffect(()=>{if(editing&&!dialogRef.current?.open)dialogRef.current?.showModal();},[editing]);
 async function edit(row:Row){setEditing({...row});setHistory([]);try{const response=await fetch('/api/admin/meal-pairings?history='+row.id);const data=await response.json();if(!response.ok)throw Error(data.error);setHistory(data.history);}catch{setError('수정 이력을 불러오지 못했어요.');}}
 async function generate(){setBusy(true);setError('');try{const r=await fetch('/api/admin/meal-pairings',{method:'POST'});const d=await r.json();if(!r.ok)throw Error(d.error);setNotice(`${d.inserted}개 후보를 추가했어요. 기존 검수 결과는 유지해요.`);await load();}catch(e){setError(e instanceof Error?e.message:'실패');}finally{setBusy(false);}}
 async function save(){if(!editing)return;setBusy(true);setError('');try{const r=await fetch('/api/admin/meal-pairings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:editing.id,status:editing.status,score:editing.score,reason:editing.reason})});const d=await r.json();if(!r.ok)throw Error(d.error);setEditing(null);setNotice('검수 결과를 저장했어요. 다른 서버의 추천에는 최대 10분 뒤 반영돼요.');await load();}catch(e){setError(e instanceof Error?e.message:'실패');}finally{setBusy(false);}}
 const filtered=useMemo(()=>rows.filter(r=>(status==='all'||r.status===status)&&(mainRole==='all'||r.mainRole===mainRole)&&`${r.mainName} ${r.companionName}`.includes(query.trim())),[rows,status,mainRole,query]);
 const list=useMemo(()=>filtered.filter(r=>category==='all'||r.template_id===category),[filtered,category]);
 useEffect(()=>{
  const target=moreRef.current;if(!target||shown>=list.length||loading)return;
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();setShown(n=>Math.min(n+24,list.length));}},{rootMargin:'600px 0px'});
  observer.observe(target);return ()=>observer.disconnect();
 },[shown,list,loading]);
 return <main className="admin-page menu-review-page"><nav className="admin-collection-tabs"><Link href="/admin/menus">← 메뉴와 사진 관리</Link><Link href="/admin/meal-pairings" aria-current="page">한 끼 조합 관리</Link></nav><header className="menu-review-heading"><div><span>MEAL COMBINATIONS</span><h1>어떤 조합으로 먹을까요?</h1></div></header>
 <p>기존 AI 메뉴 분류를 바탕으로 규칙이 제안한 후보예요. 점수는 취향 확률이 아니며, 확인한 관계만 추천에 사용해요.</p>
 <details><summary>구성 방식 설명</summary><div className="pairing-templates">{configs.map(t=><div key={t.id}><strong>{t.name}</strong><p>{t.slots.map(s=>`${roleName[s.role]??s.role} ${s.min}~${s.max}${s.included?' (메인에 포함)':''}`).join(' · ')}</p><small>{t.enabled?'구성 지원':'확장용 설계 · 추천 비활성'}</small></div>)}</div></details>
 <p className="menu-review-hint">현재는 밥이 포함된 메인 + 반찬 조합을 지원해요. 샐러드·파스타·외식 등은 역할·분량을 연결한 뒤 활성화합니다. 주식은 이중으로 더하지 않아요.</p>
 {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 <details><summary onClick={()=>{if(snapshots===null)void showSnapshots();}}>실제로 저장한 추천 구성 확인</summary><p>기능 적용 이후 로그인 사용자가 저장한 최근 20개 식단입니다. 당시 가격·구성·이유를 보존하며, 비회원의 기기 내 추천은 포함하지 않습니다.</p>{snapshots?.length===0&&<p>아직 저장된 추천 스냅샷이 없어요.</p>}{snapshots?.map(s=><details key={s.id}><summary>{new Date(s.createdAt).toLocaleString('ko-KR')} · {s.meals.length}끼</summary>{s.meals.map((m,i)=><p key={i}>{m.name} · 1인분 약 {m.price.toLocaleString()}원<br/>{m.composition?.items.map(c=>c.reason).join(' / ')}</p>)}</details>)}</details>
 <div className="menu-review-filters"><input aria-label="조합 검색" placeholder="메인·곁들임 검색" value={query} onChange={e=>{setQuery(e.target.value);setShown(24);}}/><select aria-label="검수 상태" value={status} onChange={e=>{setStatus(e.target.value);setShown(24);}}><option value="all">전체 상태</option>{Object.entries(states).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><select aria-label="메인 종류" value={mainRole} onChange={e=>{setMainRole(e.target.value);setShown(24);}}><option value="all">전체 메인 종류</option><option value="main">메인 요리</option><option value="soup">국·찌개</option><option value="one-bowl">한 그릇</option><option value="unclassified">미분류</option></select><button onClick={generate} disabled={busy}>새 조합 후보 만들기</button><span>{list.length}개</span></div>
 <section className="menu-review-categories" aria-label="조합 카테고리"><h2>카테고리별 보기</h2><p>현재 검색·검수·메인 종류 조건의 개수예요. 0개인 구성은 아직 후보가 없어요.</p><div><button type="button" aria-pressed={category==='all'} onClick={()=>{setCategory('all');setShown(24);}}>전체 <span>{filtered.length}</span></button>{configs.map(t=><button key={t.id} type="button" aria-pressed={category===t.id} onClick={()=>{setCategory(t.id);setShown(24);}}>{t.name} <span>{filtered.filter(r=>r.template_id===t.id).length}</span></button>)}</div></section>
 {loading?<p>불러오는 중…</p>:!list.length?<p>해당 조합이 없어요.</p>:<div className="pairing-grid">{list.slice(0,shown).map(r=><article key={r.id}><span className="menu-review-category">{configs.find(t=>t.id===r.template_id)?.name??r.template_id}</span><br/><small>{states[r.status]} · {r.source==='classification-rules-v1'?'AI 분류 기반 규칙':r.source}</small><h2>{r.mainName}{r.preview?.hasRice?' + 밥':''}<br/>+ {r.companionName}</h2><p><strong>조합 적합도 {r.score}점</strong> · {relationLabels[r.relation_type]}</p><p>{r.reason}</p><details><summary>점수 근거와 재료</summary><p>초기 규칙 점수: {Object.entries(r.score_details).map(([k,v])=>`${scoreLabels[k]??k} ${v}`).join(' / ')}{r.reviewed_by?' · 관리자 수정 점수는 위 합계와 다를 수 있어요.':''}</p><p>{r.preview?.ingredients.join(', ')}</p></details>{r.preview?<p className="pairing-price">1인분 재료비 약 {r.preview.price.toLocaleString()}원<br/>{r.preview.nutrition.calories??'미확인'} kcal · 단백질 {r.preview.nutrition.protein??'미확인'}g · 약 {r.preview.minutes}분</p>:<p>현재 메뉴 데이터가 없어 추천할 수 없어요.</p>}<p className="menu-review-hint">재료 가격·영양 합산 추정 · 실제 장보기는 판매 묶음으로 별도 계산</p><button disabled={busy} onClick={()=>void edit(r)}>관계 검수·수정</button></article>)}</div>}
 {!loading&&list.length>0&&<div ref={moreRef} className="menu-review-scroll-status" role="status">{Math.min(shown,list.length).toLocaleString()} / {list.length.toLocaleString()}개 표시 · {shown<list.length?'아래로 스크롤하면 계속 보여드려요':'모든 조합을 확인했어요'}</div>}
 {editing&&<dialog ref={dialogRef} className="pairing-dialog" aria-labelledby="pairing-title" onCancel={()=>setEditing(null)}><h2 id="pairing-title">{editing.mainName} + {editing.companionName}</h2><label>적합도 (0~100)<input type="number" min="0" max="100" value={editing.score} onChange={e=>setEditing({...editing,score:Number(e.target.value)})}/></label><label>조합 이유<textarea maxLength={1000} value={editing.reason} onChange={e=>setEditing({...editing,reason:e.target.value})}/></label><label>검수 상태<select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value as Row['status']})}>{Object.entries(states).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><p>변경 전후 내용과 검수자를 기록합니다.</p><details><summary>수정 이력 ({history.length})</summary>{history.map((h,i)=><p key={i}>{new Date(h.created_at).toLocaleString('ko-KR')}<br/>{states[h.before_data.status]} → {states[h.after_data.status]} · {h.before_data.score} → {h.after_data.score}점<br/>{h.after_data.reason}</p>)}</details><button disabled={busy} onClick={save}>저장</button><button disabled={busy} onClick={()=>setEditing(null)}>닫기</button></dialog>}
 </main>;
}
