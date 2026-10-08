'use client';
import {useEffect,useState} from 'react';
import {BackButton,Button,Card,LinkButton,Notice,PageHeader} from '../components/ui';
import {Icon} from '../components/icons';
import {NearbyRestaurants} from '../nearby-restaurants';
import {modes,menus,avoidOptions,type Mode,type Meal} from '../../lib/together-meal';
import s from './together.module.css';
type Session={room:string;key:string};
type State={mode:Mode;role:number;submitted:boolean;partnerDone:boolean;done:boolean;matches:Meal[]};
export default function Together(){
 const [mode,setMode]=useState<Mode>('home'),[session,setSession]=useState<Session|null>(null),[state,setState]=useState<State|null>(null),[invite,setInvite]=useState('');
 const [avoid,setAvoid]=useState<string[]>([]),[likes,setLikes]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{const p=new URLSearchParams(location.search);if(p.get('room')&&p.get('key')){const frame=requestAnimationFrame(()=>setSession({room:p.get('room')!,key:p.get('key')!}));return()=>cancelAnimationFrame(frame);}},[]);
 useEffect(()=>{if(!session)return;let alive=true;const controller=new AbortController();async function refresh(){try{const r=await fetch('/api/together?'+new URLSearchParams(session!),{signal:controller.signal});const data=await r.json();if(!r.ok)throw Error(data.error);if(alive){setState(data);setMode(data.mode);setError('');}}catch(e){if(alive)setError(e instanceof Error?e.message:'결과를 불러오지 못했어요.');}}void refresh();const timer=setInterval(refresh,2500);return()=>{alive=false;controller.abort();clearInterval(timer);};},[session]);
 async function send(action:string){setBusy(true);setError('');try{const r=await fetch('/api/together',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,mode,...session,likes,avoid})});const d=await r.json();if(!r.ok)throw Error(d.error);if(action==='create'){const next={room:d.room,key:d.key};setSession(next);history.replaceState(null,'','/together?'+new URLSearchParams(next));setInvite(location.origin+'/together?'+new URLSearchParams({room:d.room,key:d.guestKey}));}else{setState(d);if(action==='reset'){setLikes([]);setAvoid([]);}}}catch(e){setError(e instanceof Error?e.message:'다시 시도해 주세요.');}finally{setBusy(false);}}
 const candidates=menus[mode].filter(m=>!m.tags.some(t=>avoid.includes(t)));
 function toggleAvoid(t:string){const next=avoid.includes(t)?avoid.filter(x=>x!==t):[...avoid,t];setAvoid(next);setLikes(ids=>ids.filter(id=>!menus[mode].find(m=>m.id===id)?.tags.some(tag=>next.includes(tag))));}
 return <main className={s.page}>
  <BackButton href="/">오늘의 식단으로</BackButton>
  <PageHeader kicker="둘이 고르기" title={<>오늘은 <em>우리 뭐 먹지?</em></>} description="각자 고르면, 둘 다 먹고 싶은 메뉴가 보여요."/>
  {!session?<><Card><h3>어떻게 먹을까요?</h3><div className={s.chips}>{(Object.keys(modes) as Mode[]).map(m=><Button key={m} variant={mode===m?'primary':'secondary'} aria-pressed={mode===m} onClick={()=>setMode(m)}>{modes[m]}</Button>)}</div><div className={s.actions}><Button block disabled={busy} onClick={()=>void send('create')}>{busy?'초대 만드는 중…':'둘이 고르기 시작'}</Button></div></Card><Card tone="soft"><h3>마음이 겹치는 한 끼</h3><p>링크 보내기 → 각자 메뉴 고르기 → 함께 고른 메뉴 확인</p><p>로그인 없이 둘이 참여해요. 커플도, 친구도 좋아요.</p></Card></>:!state?<p role="status">함께 고를 메뉴를 준비하고 있어요…</p>:<>
  <div className={s.status}><span>{modes[mode]} · 2명</span><span>나 {state.submitted?'선택 완료':'고르는 중'}</span><span>상대 {state.partnerDone?'선택 완료':'기다리는 중'}</span></div>
  {invite&&!state.done&&<Card tone="soft"><h3>같이 먹을 사람에게 보내요</h3><Button variant="secondary" block onClick={async()=>{try{await navigator.clipboard.writeText(invite);setNotice('초대 링크를 복사했어요.');}catch{setNotice('아래 링크를 복사해 주세요.');}}}>초대 링크 복사</Button><details><summary>초대 링크 보기</summary><div className={s.link}>{invite}</div><LinkButton href={invite} target="_blank" rel="noopener noreferrer">상대 화면으로 테스트</LinkButton></details></Card>}
  {state.done?<Card><span className={s.step}>두 사람의 선택 완료</span><h3>{state.matches.length?'우리 둘 다 좋아하는 메뉴':'이번엔 마음이 엇갈렸어요'}</h3><p>{state.matches.length?'아래 후보 중에서 오늘의 한 끼를 정해 보세요.':'각자 괜찮은 메뉴를 조금 더 골라보면 어때요?'}</p><div className={s.list}>{state.matches.map(m=><Card key={m.id} tone="soft"><h3>{m.name}</h3><p>{m.description}</p>{mode==='out'&&<NearbyRestaurants menu={m.name}/>}</Card>)}</div>{mode==='home'&&state.matches.length>0&&<p>이 화면은 메뉴 합의 체험이에요. 2인분 식단·장보기 자동 반영은 아직 연결하지 않았어요.</p>}{mode==='store'&&<p>편의점 조합 예시예요. 실제 상품과 재고는 매장에서 확인해 주세요.</p>}<div className={s.actions}>{state.role===0?<Button onClick={()=>void send('reset')} disabled={busy}>다시 골라보기</Button>:<p>다시 고르려면 초대한 사람에게 알려주세요.</p>}<LinkButton href="/">오늘의 식단으로</LinkButton></div></Card>:state.submitted?<Card tone="soft"><h3>내 선택은 끝났어요</h3><p>상대도 선택을 마치면 공통 메뉴가 자동으로 나타나요.</p></Card>:<>
  <Card><h3>오늘 피하고 싶은 것</h3><div className={s.chips}>{avoidOptions.map(t=><Button key={t} variant="secondary" size="sm" aria-pressed={avoid.includes(t)} onClick={()=>toggleAvoid(t)}>{t}</Button>)}</div><p>대표 재료 기준이에요. 알레르기는 실제 재료를 꼭 확인해 주세요.</p></Card>
  <section><span className={s.step}>괜찮은 메뉴는 여러 개 골라도 좋아요</span><h3>오늘 먹고 싶은 건?</h3><div className={s.list}>{candidates.map(m=><button key={m.id} className={s.meal} aria-pressed={likes.includes(m.id)} onClick={()=>setLikes(l=>l.includes(m.id)?l.filter(id=>id!==m.id):[...l,m.id])}><span><strong>{m.name}</strong><small>{m.description}</small></span><span className={s.check}>{likes.includes(m.id)&&<Icon name="check" size={16}/>}</span></button>)}</div>{!candidates.length&&<Notice>선택할 메뉴가 없어요. 피할 항목을 조정하거나 이번 후보를 모두 패스할 수 있어요.</Notice>}<div className={s.actions}><Button block disabled={busy} onClick={()=>void send('vote')}>{busy?'선택 보내는 중…':likes.length?`${likes.length}개 선택 완료`:'이번 후보는 모두 패스'}</Button></div></section>
  </>}
  </>}
  {notice&&<Notice>{notice}</Notice>}{error&&<Notice tone="error">{error}</Notice>}
  <p>로컬 체험 · 예시 메뉴로 구성했어요. 초대는 1시간 동안 유지되며 개발 서버를 재시작하면 사라져요. 다른 기기는 같은 개발 서버에 접속해야 해요.</p>
 </main>;
}
