'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {AuthScreen} from '../auth-screen';
import {pendingSavedFood,rememberSavedFood,clearSavedFood} from '../../lib/saved-food-intent';
import {trackAnalytics} from '../../lib/analytics';
type Item={code:string;name:string;brand:string|null;slug:string|null};
export default function SavedFoods(){
 const [ready,setReady]=useState(false),[user,setUser]=useState(false),[auth,setAuth]=useState(false),[items,setItems]=useState<Item[]>([]),[selected,setSelected]=useState<Item|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{let alive=true;const code=new URLSearchParams(location.search).get('food')??pendingSavedFood();
  async function load(){try{const response=await fetch('/api/saved-foods',{cache:'no-store'});if(response.status===401){if(alive){setUser(false);setItems([]);}}else{const d=await response.json();if(!response.ok)throw Error(d.error);if(alive){setUser(true);setItems(d.items);}}
   if(code&&code.length<=100){const r=await fetch(`/api/food-reference?code=${encodeURIComponent(code)}`);if(!r.ok)throw Error('선택한 메뉴를 불러오지 못했어요.');const d=await r.json();if(alive){setSelected(d.items?.[0]??null);if(!d.items?.[0])setError('선택한 메뉴를 찾지 못했어요. 다시 검색해 주세요.');}}
  }catch(e){if(alive)setError(e instanceof Error?e.message:'메뉴를 불러오지 못했어요.');}finally{if(alive)setReady(true);}}
  void load();return()=>{alive=false;};
 },[revision]);
 async function save(code:string,action:'save'|'remove'){
  if(busy)return;setBusy(true);setError('');setNotice('');
  try{const r=await fetch('/api/saved-foods',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,action})});const d=await r.json();if(r.status===401){rememberSavedFood(code);setUser(false);setAuth(true);return;}if(!r.ok)throw Error(d.error);
   if(action==='save'){clearSavedFood();trackAnalytics('food_saved',{source:'kcal'});setNotice('다음에 먹을 메뉴에 저장했어요. 식사 기록에는 아직 추가하지 않았어요.');}else{trackAnalytics('food_unsaved',{source:'kcal'});setNotice('저장 목록에서 지웠어요. 기존 식사 기록은 그대로예요.');}setRevision(n=>n+1);
  }catch(e){trackAnalytics('food_save_failed',{source:'kcal'});setError(e instanceof Error?e.message:'저장하지 못했어요.');}finally{setBusy(false);}
 }
 // OAuth returns to this page with the selection intact. Require confirmation
 // rather than mutating an account just because somebody opened a URL.
 if(auth)return <AuthScreen purposeTitle="다음 주문 때 다시 꺼내보세요" purpose="가입하면 고른 메뉴를 계정에 보관해요. 로그인 후 저장 버튼을 눌러 완료해 주세요." onSuccess={()=>{setAuth(false);setRevision(n=>n+1);}} onExplore={()=>{clearSavedFood();setAuth(false);}}/>;
 return <>{!ready&&<p role="status">저장 목록을 불러오는 중이에요…</p>}{error&&<p role="alert">{error} <button onClick={()=>setRevision(n=>n+1)}>다시 불러오기</button></p>}{notice&&<p role="status">{notice}</p>}
 {selected&&<section className="kcal-box"><h2>{selected.brand} {selected.name}</h2><p>먹은 음식 기록과 별도로 보관해요.</p>{items.some(i=>i.code===selected.code)?<p>이미 저장한 메뉴예요.</p>:<button className="food-choice-button" disabled={!ready||busy} onClick={()=>{trackAnalytics('food_save_started',{source:'kcal'});if(!user){rememberSavedFood(selected.code);setAuth(true);}else void save(selected.code,'save');}}>{busy?'저장 중…':user?'다음에 먹을 메뉴로 저장':'가입·로그인하고 이 메뉴 저장'}</button>}</section>}
 {ready&&!user&&!selected&&<button className="food-choice-button" onClick={()=>setAuth(true)}>가입·로그인하고 저장 목록 보기</button>}
 {user&&<section><h2>저장한 메뉴 {items.length}개</h2>{!items.length&&<p>아직 저장한 메뉴가 없어요. <Link href="/kcal">음식 검색에서 찾아보세요.</Link></p>}<ul className="saved-food-list">{items.map(item=><li key={item.code}><strong>{item.brand} {item.name}</strong><div>{item.slug&&<Link href={`/kcal/${encodeURIComponent(item.slug)}`}>정보·비교 보기</Link>}<Link onClick={()=>trackAnalytics('saved_food_record_clicked',{source:'kcal'})} href={`/record?log=${encodeURIComponent(item.code)}&from=kcal`}>먹었어요 · 식사 기록</Link><button disabled={busy} onClick={()=>void save(item.code,'remove')}>저장 해제</button></div></li>)}</ul></section>}
 <p><Link href="/submissions?kind=food">없는 음식 등록 요청 · 내 요청 상태 보기 →</Link></p></>;
}
