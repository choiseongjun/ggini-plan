'use client';

import Link from 'next/link';
import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';
import {dailyMenus,dailyMenuCatalogue,activeDailyMenuIds,koreaDate,readDailyMenuCollection,DAILY_MENU_STORAGE,type DailyMenu,type DailyMenuCollection} from '../lib/daily-menu';
import {trackAnalytics} from '../lib/analytics';
import {ServiceFeedback} from './service-feedback';
import styles from './daily-menu-home.module.css';

function MenuPhoto({menu}:{menu:DailyMenu}) {
 const [failed,setFailed]=useState(false);
 return <div className={styles.photo}>{failed?<span className={styles.fallback}>{menu.name}</span>:<Image src={menu.video.thumbnail} alt={`${menu.name} 원본 영상 썸네일`} width={480} height={270} unoptimized onError={()=>setFailed(true)}/>}<span className={styles.credit}>영상 출처 · {menu.video.channel}</span></div>;
}

export function DailyMenuHome({edition}:{edition?:string}) {
 const [today,setToday]=useState('');
 const [collection,setCollection]=useState<DailyMenuCollection>({saved:[],choice:null});
 const [ready,setReady]=useState(false);
 const [view,setView]=useState<'today'|'saved'>('today');
 const [notice,setNotice]=useState('');
 const [storageError,setStorageError]=useState('');
 const [shareUrl,setShareUrl]=useState('');
 const [selected,setSelected]=useState<DailyMenu|null>(null);
 const [checked,setChecked]=useState<string[]>([]);
 const preparationHeading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{if(selected){preparationHeading.current?.focus();preparationHeading.current?.scrollIntoView({block:'start',behavior:'smooth'});}},[selected]);
 useEffect(()=>{
  const refresh=()=>setToday(koreaDate());
  const read=()=>{try{setCollection(readDailyMenuCollection(localStorage.getItem(DAILY_MENU_STORAGE)));}catch{setStorageError('이 브라우저에서는 저장할 수 없어요. 메뉴 링크를 따로 보관해 주세요.');}setReady(true);};
  refresh();read();
  const timer=setInterval(refresh,30000);
  const visible=()=>{if(document.visibilityState==='visible')refresh();};
  const sync=(event:StorageEvent)=>{if(event.key===DAILY_MENU_STORAGE||event.key===null)read();};
  document.addEventListener('visibilitychange',visible);window.addEventListener('storage',sync);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('storage',sync);};
 },[]);
 const date=edition??today;
 useEffect(()=>{if(date)trackAnalytics('daily_menu_viewed');},[date]);
 const menus=view==='saved'?dailyMenuCatalogue.filter(menu=>collection.saved.includes(menu.id)):dailyMenus(date);
 function update(change:(previous:DailyMenuCollection)=>DailyMenuCollection) {
  try {
   const next=change(readDailyMenuCollection(localStorage.getItem(DAILY_MENU_STORAGE)));
   localStorage.setItem(DAILY_MENU_STORAGE,JSON.stringify(next));setCollection(next);setStorageError('');return true;
  }catch{setStorageError('저장하지 못했어요. 브라우저 저장 공간을 확인하거나 메뉴 링크를 보관해 주세요.');return false;}
 }
 function choose(menu:DailyMenu) {
  setSelected(menu);setChecked([]);setNotice('');setShareUrl('');
  update(previous=>({...previous,choice:{date:today,id:menu.id}}));
  trackAnalytics('daily_menu_chosen');
 }
 function save(menu:DailyMenu) {
  let added=false;
  if(update(previous=>{added=!previous.saved.includes(menu.id);return {...previous,saved:added?[...previous.saved,menu.id]:previous.saved.filter(id=>id!==menu.id)};})){
   setNotice(added?`${menu.name}, 나중에 먹기에 담았어요.`:`${menu.name} 저장을 해제했어요.`);trackAnalytics(added?'daily_menu_saved':'daily_menu_unsaved');
  }
 }
 async function share(menu?:DailyMenu) {
  const url=new URL(menu?`/recipes/${menu.id}`:`/daily/v1/${date}`,window.location.origin).href;
  const title=menu?`${menu.name}, 같이 먹을래?`:`${date.slice(5).replace('-','/')} 오늘의 끼니 3선`;
  try {
   if(navigator.share){await navigator.share({title,text:menu?'재료와 만드는 법을 로그인 없이 볼 수 있어요.':'셋 중에 뭐 먹을래? 한 끼를 같이 골라봐요.',url});}
   else {await navigator.clipboard.writeText(url);setNotice('공유 링크를 복사했어요. 친구에게 보내보세요.');}
   setShareUrl('');trackAnalytics('daily_menu_shared');
  }catch(error){if(error instanceof Error&&error.name==='AbortError')return;setShareUrl(url);setNotice('아래 링크를 복사해 공유해 주세요.');}
 }
 const chosen=collection.choice?.date===today?dailyMenuCatalogue.find(menu=>menu.id===collection.choice?.id&&activeDailyMenuIds.has(menu.id)):null;
 return <div className={styles.home}>
  <header className={styles.hero}><span className={styles.kicker}>{date?`${date.slice(5).replace('-','월 ')}일 · `:''}매일 바뀌는 메뉴판</span><h1>{edition&&edition!==today?'그날의 끼니 3선':'오늘 뭐 해 먹지?'}</h1><p>끌리는 메뉴를 누르면 레시피 영상이 바로 열려요.<br/>보면서 오늘 한 끼를 준비해요.</p><small>한국 시간 자정에 교체 · 저장한 메뉴는 계속 볼 수 있어요</small>{edition&&<Link href="/">오늘 메뉴 보러 가기 →</Link>}</header>
  <div className={styles.tabs} role="group" aria-label="메뉴 모아보기"><button type="button" aria-pressed={view==='today'} onClick={()=>{setView('today');setSelected(null);}}>{edition?'공유받은 3선':'오늘의 3선'}</button><button type="button" aria-pressed={view==='saved'} onClick={()=>{setView('saved');setSelected(null);}}>나중에 먹기 {ready?collection.saved.length:''}</button></div>
  <p className={styles.storageNote}>저장과 오늘의 선택은 로그인 없이 이 브라우저에 보관돼요.</p>
  {chosen&&!selected&&<div className={styles.choice}><span>오늘의 선택</span><strong>{chosen.name}</strong><button type="button" onClick={()=>choose(chosen)}>영상 이어보기 →</button></div>}
  <p role="status" className={styles.notice}>{notice}</p>{storageError&&<p role="alert" className={styles.error}>{storageError}</p>}
  {shareUrl&&<label className={styles.shareFallback}>공유 링크<input readOnly value={shareUrl} onFocus={event=>event.target.select()}/></label>}
  {selected&&<section className={styles.preparation} aria-labelledby="preparation-title">
   <button type="button" className={styles.back} onClick={()=>{setSelected(null);setNotice('');}}>← 다른 메뉴 고르기</button>
   <span className={styles.kicker}>레시피 영상</span>
   <h2 id="preparation-title" ref={preparationHeading} tabIndex={-1}>{selected.name}</h2>
   {selected.accompaniment&&<p>{selected.accompaniment}</p>}
   <div className={styles.videoPlayer}><iframe key={selected.video.id} src={`https://www.youtube.com/embed/${encodeURIComponent(selected.video.id)}?autoplay=1&playsinline=1&rel=0`} title={`${selected.name} · ${selected.video.channel} 레시피 영상`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></div>
   <p className={styles.preparationNote}>{selected.video.channel} · 자동 재생이 안 되면 영상의 재생 버튼을 눌러주세요. <a href={selected.video.url} target="_blank" rel="noopener noreferrer">YouTube에서 보기 ↗</a></p>
   <div className={styles.preparationStep}><h3>보면서 재료를 확인해요</h3></div>
   <p className={styles.preparationNote}>이 목록은 주요 재료 미리보기예요. 양념을 포함한 전체 재료와 분량은 영상과 원본 설명란에서 확인해 주세요.</p>
   <div className={styles.checklist}>{selected.ingredients.map(item=><label key={item.name}><input type="checkbox" checked={checked.includes(item.name)} onChange={event=>setChecked(previous=>event.target.checked?[...previous,item.name]:previous.filter(name=>name!==item.name))}/><span>{item.label}</span></label>)}</div>
   <p className={styles.preparationNote} aria-live="polite">{checked.length===selected.ingredients.length?'주요 재료는 모두 있네요. 원본의 양념과 분량도 확인하고 시작해요.':checked.length?'아직 확인할 재료: '+selected.ingredients.filter(item=>!checked.includes(item.name)).map(item=>item.name).join(' · '):'있는 재료만 체크해도 돼요. 영상을 보면서 확인해도 돼요.'}</p>
   <div className={styles.defer}><strong>지금 만들기 어렵다면</strong><button type="button" onClick={()=>save(selected)}>{collection.saved.includes(selected.id)?'저장됨 ♥ · 저장 해제':'다음에 만들 메뉴로 저장 ♡'}</button><Link href="/ingredients">있는 재료로 다른 메뉴 찾기 →</Link><button type="button" onClick={()=>void share(selected)}>같이 먹을 사람에게 보내기 ↗</button></div>
  </section>}
  {!selected&&<>
  {!ready?<p role="status">오늘의 메뉴판을 펼치고 있어요…</p>:menus.length===0?<div className={styles.empty}><strong>다음에 먹고 싶은 메뉴를 담아보세요.</strong><p>오늘 메뉴가 바뀌어도 여기서 다시 볼 수 있어요.</p><button type="button" onClick={()=>{setView('today');setSelected(null);}}>세 가지 메뉴 보러 가기 →</button></div>:<div className={styles.cards}>{menus.map((menu,index)=><article key={menu.id} className={styles.card}>
   <MenuPhoto menu={menu}/><div className={styles.body}><span className={styles.number}>{view==='today'?`PICK 0${index+1}`:'MY MENU'} · {menu.group===0?'밥·면 한 그릇':menu.group===1?'국·찌개와 한 끼':'밥에 곁들이기'}</span><h2>{menu.name}</h2><p className={styles.ingredients}>{menu.ingredients.filter(item=>!('optional' in item&&item.optional)).slice(0,4).map(item=>item.name).join(' · ')}</p>{menu.accompaniment&&<small>{menu.accompaniment}</small>}
   <div className={styles.actions}><button type="button" className={styles.primary} aria-pressed={chosen?.id===menu.id} onClick={()=>choose(menu)}>{chosen?.id===menu.id?'영상 이어보기 →':'레시피 영상 보기 ▶'}</button><button type="button" aria-pressed={collection.saved.includes(menu.id)} onClick={()=>save(menu)}>{collection.saved.includes(menu.id)?'저장됨 ♥':'나중에 먹기 ♡'}</button></div>
   <details className={styles.recipe}><summary>{menu.steps.length?'재료와 만드는 법':'주요 재료 · 원본 레시피'}</summary><p>{menu.servingLabel}</p><ul>{menu.ingredients.map((item,i)=><li key={i}>{item.label}{'optional' in item&&item.optional?' (선택)':''}</li>)}</ul>{menu.steps.length>0&&<ol>{menu.steps.map((step,i)=><li key={i}>{step}</li>)}</ol>}<a href={menu.video.url} target="_blank" rel="noopener noreferrer">{menu.video.channel} · 원본 영상 보기 ↗</a></details>
   <button type="button" className={styles.shareOne} onClick={()=>void share(menu)}>이 메뉴 친구에게 보내기 ↗</button>
  </div></article>)}</div>}
  {ready&&view==='today'&&<button className={styles.shareAll} type="button" onClick={()=>void share()}>셋 중 뭐 먹을래? 메뉴판 공유하기 ↗</button>}
  <aside className={styles.more}><strong>이 셋이 당기지 않는다면</strong><p>취향과 못 먹는 재료를 반영해 따로 추천받을 수 있어요.</p><Link href="/next-meal">내 조건으로 다른 메뉴 찾기 →</Link><Link href="/ingredients">집에 있는 재료로 찾기 →</Link></aside>
  </>}
  <p className={styles.maker}>혼자 만드는 끼니플랜.<br/>오늘 고른 한 끼 이야기를 들려주세요.</p><ServiceFeedback page={edition?'/daily':'/'}/>
 </div>;
}
