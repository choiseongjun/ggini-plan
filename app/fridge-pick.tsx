'use client';
import {useEffect,useRef,useState} from 'react';
import {Button,LinkButton,Notice} from './components/ui';
import {RiceBuddy} from './rice-buddy';
import {FRIDGE_CHIPS,shoppingLine,type FridgeChip,type FridgePick} from '../lib/fridge-pick';
import {kstClock,mealsFromNow} from '../lib/meal-now';
import {trackAnalytics} from '../lib/analytics';
import {useFoodIntake} from './food-intake';
import styles from './fridge-pick.module.css';
import {josa} from '../lib/josa';

const SLOT_LABEL={breakfast:'아침',lunch:'점심',dinner:'저녁'} as const;
const CHIPS_KEY='kkiniplan-fridge-chips-v1';

// 홈 첫 화면 한 가지 행동: "냉장고에 있는 거 누르면, 오늘 해 먹을 한 끼를 정해 줘요."
export function FridgePick({userId,onPantry,onRecommend}:{userId?:string;onPantry:()=>void;onRecommend:()=>void}){
 const [clock]=useState(()=>kstClock());
 const plan=mealsFromNow(clock),slot=plan.slots[0];
 const when=`${plan.tomorrow?'내일':'오늘'} ${SLOT_LABEL[slot]}`;
 // 지난번에 누른 재료를 기억해 다시 누르지 않아도 되게 한다(이 기기에만).
 const [chips,setChips]=useState<FridgeChip[]>(()=>{try{const saved=JSON.parse(localStorage.getItem(CHIPS_KEY)??'[]');return Array.isArray(saved)?saved.filter((key:unknown)=>FRIDGE_CHIPS.some(chip=>chip.key===key)):[];}catch{return [];}});
 const [picks,setPicks]=useState<FridgePick[]|null>(null),[index,setIndex]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [logged,setLogged]=useState<string|null>(null);
 const seen=useRef<string[]>([]);
 const resultRef=useRef<HTMLElement>(null);
 const intake=useFoodIntake(userId);
 useEffect(()=>{try{localStorage.setItem(CHIPS_KEY,JSON.stringify(chips));}catch{}},[chips]);

 const toggle=(key:FridgeChip)=>{setChips(current=>current.includes(key)?current.filter(k=>k!==key):[...current,key]);setPicks(null);};
 async function decide(){
  setBusy(true);setError('');setLogged(null);
  trackAnalytics('fridge_pick_requested');
  try{
   const r=await fetch('/api/fridge-pick',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chips,skip:seen.current.slice(-20)})});
   const d=await r.json();if(!r.ok)throw new Error(d.error);
   if(!d.picks?.length)throw new Error('지금 고른 재료로 만들 메뉴를 찾지 못했어요. 재료를 하나 더 눌러 보세요.');
   seen.current=[...seen.current,d.picks[0].id];
   setPicks(d.picks);setIndex(0);
   requestAnimationFrame(()=>resultRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));
  }catch(e){setError(e instanceof Error?e.message:'메뉴를 고르지 못했어요. 다시 시도해 주세요.');}
  finally{setBusy(false);}
 }
 // "다른 거": 받아 둔 후보를 먼저 넘기고, 다 보면 새로 고른다.
 function another(){
  if(picks&&index+1<picks.length){const next=index+1;seen.current=[...seen.current,picks[next].id];setIndex(next);setLogged(null);return;}
  void decide();
 }
 function ate(pick:FridgePick){
  void intake.send({action:'log',id:crypto.randomUUID(),version:intake.current?.version??0,productId:pick.id,portions:1,extras:[],mealSlot:slot,guest:{name:pick.name,...pick.nutrition,sugar:null}}).then(ok=>{if(ok)setLogged(pick.id);});
 }
 const pick=picks?.[index];

 return <section className={styles.fridge} aria-labelledby="fridge-title">
  <div className={styles.talk}>
   <div className={styles.buddy} aria-hidden="true"><RiceBuddy stage={4}/></div>
   <div className={styles.bubble}>
    <h2 id="fridge-title">{when}, 냉장고에 뭐 있어?</h2>
    <p>있는 거 다 눌러 줘. 바로 해 먹을 한 끼 정해 줄게.</p>
   </div>
  </div>
  <div className={styles.chips} role="group" aria-label="냉장고에 있는 재료">
   {FRIDGE_CHIPS.map(chip=>{const on=chips.includes(chip.key);return <button key={chip.key} type="button" className={styles.chip} aria-pressed={on} onClick={()=>toggle(chip.key)}>{on&&<span aria-hidden="true">✓ </span>}{chip.label}</button>;})}
  </div>
  <Button size="lg" block disabled={busy} onClick={()=>void decide()}>{busy?'고르는 중…':chips.length?'이걸로 정해 줘':'냉장고 텅 비었어 · 하나만 사면 되는 걸로'}</Button>
  {error&&<Notice tone="error">{error}</Notice>}

  {pick&&<article ref={resultRef} className={styles.result} aria-live="polite" tabIndex={-1}>
   <p className={styles.kicker}>{when}은 이거 어때?</p>
   <h3 className={styles.name}>{pick.name}</h3>
   <p className={styles.uses}>{pick.uses.length?`있는 ${josa(pick.uses.join('·'),'으로','로')} 만들어요`:'재료 하나만 사면 바로 만들 수 있어요'}{pick.kcal!==null&&` · 약 ${pick.kcal.toLocaleString('ko-KR')}kcal`}</p>
   <p className={pick.missing.length?styles.shop:styles.ready}>{shoppingLine(pick.missing)}</p>
   <div className={styles.actions}>
    <LinkButton variant="primary" size="lg" block href={`/recipes/${encodeURIComponent(pick.id)}`} onClick={()=>trackAnalytics('fridge_pick_recipe_opened')}>만드는 법 보기</LinkButton>
    <div className={plan.tomorrow?styles.single:styles.row}>
     <Button variant="secondary" block disabled={busy} onClick={another}>다른 거</Button>
     {/* 내일 끼니를 고른 밤에는 아직 먹을 수 없으니 기록 버튼을 두지 않는다. */}
     {!plan.tomorrow&&<Button variant="secondary" block disabled={intake.busy||logged===pick.id} onClick={()=>ate(pick)}>{logged===pick.id?'기록했어요 ✓':'먹었어요'}</Button>}
    </div>
   </div>
   <p className={styles.note}>간장·설탕·식용유 같은 기본 양념은 집에 있다고 봤어요.</p>
  </article>}

  <nav className={styles.more} aria-label="다른 방법">
   <button type="button" onClick={()=>{trackAnalytics('home_entry_selected',{entry:'pantry'});onPantry();}}>사진으로 재료 찾기·자세히 입력</button>
   <button type="button" onClick={()=>{trackAnalytics('home_entry_selected',{entry:'recommend'});onRecommend();}}>재료 없이 메뉴부터 추천받기</button>
  </nav>
 </section>;
}
