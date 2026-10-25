'use client';
import {useCallback,useEffect,useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import Image from 'next/image';
import {BackButton,Button,Card,LinkButton,Notice} from '../components/ui';
import {battleResult,type DinnerBattle} from '../../lib/dinner-battle';
import styles from './battle.module.css';
async function api(url:string,options?:RequestInit){
 const res=await fetch(url,{...options,cache:'no-store'});
 const data=await res.json();
 if(!res.ok)throw new Error(data.error||'요청을 처리하지 못했어요. 다시 시도해 주세요.');
 return data;
}
export function BattleCreate(){
 const router=useRouter();
 const [a,setA]=useState(''),[b,setB]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[ready,setReady]=useState(false);
 const prepare=useCallback(()=>{api('/api/dinner-battles').then(()=>{setReady(true);setError('');}).catch(()=>setError('투표를 준비하지 못했어요. 다시 시도해 주세요.'));},[]);
 useEffect(()=>{prepare();},[prepare]);
 async function create(event:FormEvent){event.preventDefault();setBusy(true);setError('');try{const data=await api('/api/dinner-battles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({menuA:a,menuB:b})});router.push(`/battle/${data.id}`);}catch(e){setError(e instanceof Error?e.message:'다시 시도해 주세요.');setBusy(false);}}
 return <main className={styles.page}><BackButton href="/">오늘로</BackButton><header><p className={styles.badge}>친구가 골라주는 한 끼</p><h1>오늘 뭐 먹지?<br/>결승전</h1><p>딱 두 개만 골라요.<br/>마지막 선택은 친구들에게 맡겨 봐요.</p></header>
 <Card><form className={styles.form} onSubmit={create}><label>첫 번째 메뉴<input value={a} onChange={e=>setA(e.target.value)} placeholder="예: 제육볶음" required maxLength={40}/></label><label>두 번째 메뉴<input value={b} onChange={e=>setB(e.target.value)} placeholder="예: 돈까스" required maxLength={40}/></label><Button type="submit" block size="lg" disabled={busy||!ready}>{busy?'투표를 만들고 있어요…':'친구에게 물어보기'}</Button><p className={styles.muted}>24시간 동안 가입 없이 투표해요. 메뉴와 인증 사진은 링크를 가진 누구나 볼 수 있어요. 사진 인증·삭제는 만든 브라우저에서 할 수 있어요. 쿠키를 지우면 관리 권한을 잃어요.</p></form></Card>
 {error&&<Notice tone="error" action={!ready?<Button variant="secondary" onClick={prepare}>다시 시도</Button>:undefined}>{error}</Notice>}
 <Card tone="soft"><h2>고르기 → 투표 → 먹었어요</h2><p>링크를 보내고, 친구들이 고른 메뉴를 확인해요. 먹은 뒤 사진 한 장으로 결과를 알려 주세요.</p><div className={styles.actions}><Button variant="ghost" onClick={()=>{setA('제육볶음');setB('돈까스');}}>제육 vs 돈까스</Button><Button variant="ghost" onClick={()=>{setA('김치찌개');setB('된장찌개');}}>김치찌개 vs 된장찌개</Button></div></Card></main>;
}
export function BattleView({id}:{id:string}){
 const router=useRouter();const [battle,setBattle]=useState<DinnerBattle|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[link,setLink]=useState(''),[choice,setChoice]=useState('0'),[caption,setCaption]=useState(''),[photo,setPhoto]=useState<File|null>(null),[confirmDelete,setConfirmDelete]=useState(false);
 const load=useCallback(()=>api(`/api/dinner-battles/${id}`).then(data=>{setBattle(data);setError('');}).catch(e=>{setError(e instanceof Error?e.message:'투표를 불러오지 못했어요.');}),[id]);
 useEffect(()=>{void load();},[load]);
 async function act(payload:unknown){setBusy(true);setError('');setMessage('');try{await api(`/api/dinner-battles/${id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});await load();}catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요.');}finally{setBusy(false);}}
 async function share(){const url=window.location.href;setLink(url);try{if(navigator.share){await navigator.share({title:'오늘 뭐 먹지? 결승전',text:`${battle?.menuA} vs ${battle?.menuB}, 내 한 끼를 골라줘!`,url});setMessage('공유했어요. 친구들의 선택을 기다려 봐요.');}else{await navigator.clipboard.writeText(url);setMessage('링크를 복사했어요. 친구에게 보내 주세요.');}}catch(e){if(!(e instanceof Error&&e.name==='AbortError'))setMessage('아래 링크를 길게 눌러 복사해 주세요.');}}
 async function finish(event:FormEvent){event.preventDefault();if(!photo)return;setBusy(true);setError('');try{const form=new FormData();form.set('choice',choice);form.set('caption',caption);form.set('photo',photo);await api(`/api/dinner-battles/${id}`,{method:'POST',body:form});await load();setPhoto(null);setMessage('식사 인증을 올렸어요. 투표도 마감됐어요.');}catch(e){setError(e instanceof Error?e.message:'사진을 올리지 못했어요.');}finally{setBusy(false);}}
 const total=battle?battle.votes[0]+battle.votes[1]:0;
 return <main className={styles.page}><BackButton href="/">오늘로</BackButton><header><p className={styles.badge}>끼니플랜 · 한 끼 결승전</p><h1>{battle?.closed?'오늘의 선택은?':'내 한 끼를 골라줘'}</h1><p>{battle?.closed?'투표가 마감됐어요. 결과를 확인해요.':'더 끌리는 메뉴를 눌러요. 가입 없이 참여해요.'}</p></header>
 {error&&<Notice tone="error" action={<Button variant="secondary" onClick={load}>다시 불러오기</Button>}>{error}</Notice>}
 {!battle&&!error&&<Notice>투표를 불러오고 있어요…</Notice>}
 {battle&&<><div className={styles.choices}>{[battle.menuA,battle.menuB].map((name,i)=><button className={styles.choice} key={i} aria-pressed={battle.voted===i} disabled={busy||battle.closed} onClick={()=>act({action:'vote',choice:i})}><span>{i===0?'A':'B'} {battle.voted===i?'· 내 선택':''}</span><strong>{name}</strong><span>{battle.votes[i]}표 · {total?Math.round(battle.votes[i]/total*100):0}%</span><progress max={Math.max(1,total)} value={battle.votes[i]} aria-label={`${name} 득표`}/></button>)}</div>
 <div aria-live="polite"><strong>{battleResult(battle.votes)}</strong><p className={styles.muted}>{total}표 · {battle.closed?'마감':`${new Date(battle.expiresAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} 마감 (한국 시간)`}<br/>브라우저당 한 표예요. 마감 전에는 선택을 바꿀 수 있어요.</p></div>
 <div className={styles.actions}><Button disabled={busy} onClick={share}>친구에게 공유하기</Button><Button variant="ghost" disabled={busy} onClick={load}>결과 새로고침</Button></div>
 {link&&<p className={styles.url}><a href={link}>{link}</a></p>}{message&&<Notice tone="success">{message}</Notice>}
 {battle.hasPhoto&&<Card><h2>{battle.eatenChoice===0?battle.menuA:battle.menuB}, 먹었어요</h2><Image unoptimized width={1200} height={1200} className={styles.photo} src={`/api/dinner-battles/${id}/photo`} alt="만든 사람이 올린 식사 인증"/>{battle.caption&&<p>{battle.caption}</p>}</Card>}
 {battle.mine&&!battle.hasPhoto&&<Card><h2>결과를 식탁으로</h2><form className={styles.form} onSubmit={finish}><label>실제로 먹은 메뉴<select value={choice} onChange={e=>setChoice(e.target.value)}><option value="0">{battle.menuA}</option><option value="1">{battle.menuB}</option></select></label><label>식사 사진<input type="file" accept="image/jpeg,image/png,image/webp" required onChange={e=>setPhoto(e.target.files?.[0]??null)}/></label><label>친구들에게 한마디<textarea maxLength={200} value={caption} onChange={e=>setCaption(e.target.value)} placeholder="너희가 골라준 메뉴 먹었어!"/></label><p className={styles.muted}>사진과 한마디는 링크를 가진 누구나 볼 수 있어요. 인증을 올리면 투표가 마감돼요.</p><Button type="submit" variant="secondary" disabled={busy||!photo}>{busy?'저장하고 있어요…':'먹었어요 · 사진 인증'}</Button></form></Card>}
 <Card tone="soft"><h2>내 저녁도 골라줘!</h2><p>이번엔 내 차례예요. 메뉴 두 개로 친구들에게 물어봐요.</p><LinkButton href="/battle" block>내 결승전 만들기</LinkButton></Card>
 {battle.mine&&<details><summary>내 투표 관리</summary><div className={styles.actions}>{!battle.closed&&<Button variant="secondary" disabled={busy} onClick={()=>act({action:'close'})}>투표 마감하기</Button>}<Button variant="ghost" onClick={()=>setConfirmDelete(!confirmDelete)}>투표 삭제</Button></div>{confirmDelete&&<Notice tone="warning" action={<Button variant="danger" disabled={busy} onClick={async()=>{setBusy(true);try{await api(`/api/dinner-battles/${id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete'})});router.replace('/battle');}catch{setError('삭제하지 못했어요. 다시 시도해 주세요.');setBusy(false);}}}>투표와 인증 삭제하기</Button>}>투표와 인증 사진을 함께 삭제해요. 공유 링크에서도 사라지고 되돌릴 수 없어요.</Notice>}</details>}</>}
 </main>;
}
