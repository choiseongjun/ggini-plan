import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Button} from '@toss/tds-mobile';
import {TDSMobileAITProvider} from '@toss/tds-mobile-ait';
import {Device,User} from '@apps-in-toss/web-framework';
import {initialConditions,parseConditions,purchaseBasket,mealSchedule,slotLabels,type PlanProduct,type PlanConditions,type MealSlot} from '../../lib/shopping-plan';
import {excludedFoods,type ExcludedFood} from '../../lib/excluded-foods';
import {servingNutrition} from '../../lib/food-intake';
import {parseSaved,type Saved} from './model';
import './style.css';
const won=(n:number)=>Math.round(n).toLocaleString('ko-KR')+'원';
function App(){
 const [products,setProducts]=useState<PlanProduct[]>([]),[key,setKey]=useState(''),[stamp,setStamp]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const [form,setForm]=useState<PlanConditions>(initialConditions),[saved,setSaved]=useState<Saved|null>(null),[screen,setScreen]=useState<'setup'|'meals'|'cart'>('setup'),[day,setDay]=useState(1),[busy,setBusy]=useState(false),[reset,setReset]=useState(false);
 const worker=useRef<Worker|null>(null),heading=useRef<HTMLHeadingElement>(null),[focus,setFocus]=useState(0);
 useEffect(()=>{const controller=new AbortController();let active=true;const timer=setTimeout(()=>controller.abort(),15000);
  (async()=>{try{
   const r=await fetch('/catalog.json',{signal:controller.signal});if(!r.ok)throw new Error('상품 정보를 읽지 못했어요.');const d=await r.json();
   const identity=import.meta.env.DEV?{hash:'local-preview'}:await Promise.race([User.getAnonymousKey(),new Promise<never>((_,reject)=>controller.signal.addEventListener('abort',()=>reject(new Error('토스 연결을 확인하고 다시 시도해 주세요.')),{once:true}))]);
   const storageKey='kkiniplan-toss-v1-'+identity.hash;const restored=parseSaved(localStorage.getItem(storageKey),d.products);
   if(active){setProducts(d.products);setStamp(d.exportedAt.slice(0,10));setKey(storageKey);if(restored){setSaved(restored);setForm(restored.conditions);setScreen('meals');}setLoading(false);setError('');}
  }catch(e){if(active){setError(e instanceof Error?e.message:'연결을 확인해 주세요.');setLoading(false);}}finally{clearTimeout(timer);}})();
  return()=>{active=false;clearTimeout(timer);controller.abort();};
 },[retry]);
 useEffect(()=>()=>worker.current?.terminate(),[]);
 useEffect(()=>{if(focus){heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}},[focus]);
 function persist(next:Saved){try{localStorage.setItem(key,JSON.stringify(next));setSaved(next);setError('');return true;}catch{setError('기기에 저장할 공간이 부족해요. 저장 공간을 확인해 주세요.');return false;}}
 function go(next:typeof screen){setScreen(next);setFocus(n=>n+1);}
 function generate(index?:number){
  if(busy)return;const conditions=parseConditions(index===undefined?form:saved?.conditions);if(!conditions){setError('기간과 끼니, 1천원~100만원 사이의 예산을 확인해 주세요.');return;}
  setBusy(true);setError('');worker.current?.terminate();const w=new Worker(new URL('./planner.worker.ts',import.meta.url),{type:'module'});worker.current=w;
  const timeout=setTimeout(()=>{w.terminate();setBusy(false);setError('계산이 오래 걸리고 있어요. 기간을 줄여 다시 시도해 주세요.');},60000);
  const finish=()=>{clearTimeout(timeout);w.terminate();worker.current=null;setBusy(false);};
  w.onmessage=({data})=>{finish();if(!data.ids){setError(data.error??(data.guide?.minimum!=null?`이 조건의 장보기 예산은 약 ${won(data.guide.minimum)}부터 필요해요. 예산이나 끼니 수를 조정해 주세요.`:'조건에 맞는 메뉴가 부족해요. 피할 재료나 먹는 방식을 바꿔 주세요.'));return;}
   const next={conditions,ids:data.ids,have:saved?.have??{}};if(persist(next)){setDay(1);go('meals');}};
  w.onerror=()=>{finish();setError('추천 계산에 문제가 생겼어요. 다시 시도해 주세요.');};w.postMessage({products,conditions,ids:saved?.ids,index});
 }
 async function open(url:string){try{const u=new URL(url);if(!['https:','mailto:'].includes(u.protocol))throw new Error();if(import.meta.env.DEV){window.open(url,'_blank','noopener,noreferrer');}else await Device.openURL(url);}catch{setError('링크를 열지 못했어요. 잠시 후 다시 시도해 주세요.');}}
 const rows=saved?purchaseBasket(saved.ids,products,[],saved.have):[],total=rows.reduce((n,r)=>n+r.cost,0);
 const days=form.days??7,slots=form.slots??['dinner'];
 function setSlots(next:MealSlot[]){if(next.length)setForm({...form,slots:next,meals:days*next.length});}
 function picture(p:PlanProduct){return p.productImageUrl?<img src={p.productImageUrl} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display='none';}}/>:<span className="emoji">{p.emoji}</span>;}
 function links(p:PlanProduct){return <div className="links">{p.productUrl&&<Button size="small" variant="weak" onClick={()=>void open(p.productUrl!)}>판매처 보기 ↗</Button>}<Button size="small" variant="weak" onClick={()=>void open('https://search.shopping.naver.com/search/all?query='+encodeURIComponent(p.name))}>가격 검색 ↗</Button></div>;}
 return <main><header><img src="/icon.png" alt=""/><div><strong>끼니플랜</strong><span>내 예산으로 챙기는 한 끼</span></div></header>
 {loading?<p role="status">🌱 메뉴를 준비하고 있어요…</p>:!products.length||!key?<Button onClick={()=>{setLoading(true);setRetry(n=>n+1);}}>다시 불러오기</Button>:<>
 <nav aria-label="끼니플랜 메뉴"><Button variant={screen==='setup'?'fill':'weak'} onClick={()=>go('setup')}>예산 설정</Button><Button variant={screen==='meals'?'fill':'weak'} disabled={!saved} onClick={()=>go('meals')}>추천 식단</Button><Button variant={screen==='cart'?'fill':'weak'} disabled={!saved} onClick={()=>go('cart')}>장보기</Button></nav>
 {screen==='setup'&&<section><p className="eyebrow">💰 예산부터 가볍게</p><h1 ref={heading} tabIndex={-1}>며칠 동안, 뭐 먹을까요?</h1><p>간편식과 직접 만드는 한 끼를 함께 비교해요.</p><form onSubmit={e=>{e.preventDefault();generate();}}><fieldset disabled={busy}>
 <label>며칠을 준비할까요?<select value={days} onChange={e=>setForm({...form,days:+e.target.value,meals:+e.target.value*slots.length})}>{Array.from({length:15},(_,i)=><option key={i} value={i+1}>{i+1}일</option>)}</select></label>
 <fieldset className="choices"><legend>챙길 끼니</legend>{Object.entries(slotLabels).map(([k,v])=><label key={k}><input type="checkbox" checked={slots.includes(k as MealSlot)} onChange={e=>setSlots(e.target.checked?[...slots,k as MealSlot].sort((a,b)=>Object.keys(slotLabels).indexOf(a)-Object.keys(slotLabels).indexOf(b)):slots.filter(s=>s!==k))}/>{v}</label>)}</fieldset>
 <label>장보기 예산 (배송비 제외)<input type="number" inputMode="numeric" min={1000} max={1000000} step={1000} value={form.budget} onChange={e=>setForm({...form,budget:+e.target.value})}/></label>
 <p className="note">총 {form.meals}끼 · 한 끼 예산 {won(form.budget/form.meals)}<br/>한 끼 6,000원으로 잡으면 총 {won(form.meals*6000)}이에요. 실제 필요한 금액은 메뉴와 판매 묶음에 따라 달라져요.</p><Button type="button" size="small" variant="weak" onClick={()=>setForm({...form,budget:form.meals*6000})}>예산 예시 적용</Button>
 <label>먹는 방식<select value={form.mealMode} onChange={e=>setForm({...form,mealMode:e.target.value as PlanConditions['mealMode']})}><option value="mixed">간편식 + 직접 요리</option><option value="ready">간편식</option><option value="cook">직접 요리</option></select></label>
 <details><summary>피할 재료 · {form.excluded?.length??0}개</summary><div className="choices">{Object.entries(excludedFoods).map(([k,v])=><label key={k}><input type="checkbox" checked={form.excluded?.includes(k as ExcludedFood)??false} onChange={e=>setForm({...form,excluded:e.target.checked?[...form.excluded??[],k as ExcludedFood]:(form.excluded??[]).filter(x=>x!==k)})}/>{v}</label>)}</div><p className="note">등록된 재료 정보로 걸러요. 알레르기가 있다면 구매 전 포장 표시도 확인해 주세요.</p></details>
 <Button type="submit" display="block" loading={busy}>추천받기</Button></fieldset></form></section>}
 {screen==='meals'&&saved&&<section><p className="eyebrow">🍚 오늘도 한 끼</p><h1 ref={heading} tabIndex={-1}>이렇게 먹어요</h1><div className="days" aria-label="식단 날짜">{Array.from({length:saved.conditions.days??7},(_,i)=><Button size="small" variant={day===i+1?'fill':'weak'} key={i} aria-pressed={day===i+1} onClick={()=>setDay(i+1)}>{i+1}일차</Button>)}</div>
 {saved.ids.map((id,i)=>{const when=mealSchedule(saved.conditions)[i];if(when.day!==day)return null;const p=products.find(p=>p.id===id)!;const nutrition=servingNutrition(p),cost=p.recipe?p.recipe.ingredients.reduce((n,r)=>n+r.product.price*r.packs,0):p.price/p.servings;return <article key={i}><p className="eyebrow">{when.day}일차 · {slotLabels[when.slot]} · {p.recipe?'🍳 직접 요리':'🛍️ 판매 상품'}</p><div className="product">{picture(p)}<h2>{p.name}</h2></div><strong className="price">한 끼 약 {won(cost)}</strong><p className="note">{nutrition.calories===null?'칼로리 정보 미확인':`${Math.round(nutrition.calories)} kcal`} · {nutrition.protein===null?'단백질 정보 미확인':`단백질 ${Math.round(nutrition.protein*10)/10}g`}{p.recipe?` · 약 ${p.recipe.minutes}분`:''}</p>
 {p.recipe?<details><summary>재료와 만드는 법</summary><ul>{p.recipe.ingredients.map(r=><li key={r.product.id}>{r.label}</li>)}</ul><ol>{p.recipe.steps.map((s,j)=><li key={j}>{s}</li>)}</ol></details>:links(p)}
 <Button size="small" variant="weak" disabled={busy} onClick={()=>generate(i)}>다른 메뉴로 ↻</Button></article>;})}<Button display="block" onClick={()=>go('cart')}>장보기 목록 · 추가 {won(total)}</Button><p className="note">한 끼 비용은 먹는 양의 재료비예요. 처음 장볼 때는 판매 묶음 단위로 구매해 더 들 수 있어요.</p></section>}
 {screen==='cart'&&saved&&<section><p className="eyebrow">🧺 겹치는 재료는 한 번에</p><h1 ref={heading} tabIndex={-1}>나의 장보기</h1><div className="summary"><span>추가 장보기 예상</span><strong>{won(total)}</strong><small>배송비 별도 · 등록된 판매 묶음 기준</small></div>{rows.map(r=><article key={r.product.id}><div className="product">{picture(r.product)}<h2>{r.product.name}</h2></div><p>{r.product.detail}</p><strong>{r.packs?`${r.packs}묶음 추가 · ${won(r.cost)}`:'준비했어요 ✓'}</strong><p className="note">식단에 {Number(r.required.toFixed(2))}묶음 사용 · 보유 {saved.have[r.product.id]??0}묶음</p>{links(r.product)}<label>구매했거나 집에 있는 수량 (묶음)<input type="number" inputMode="decimal" min={0} max={10000} step="any" value={saved.have[r.product.id]??0} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&n>=0&&n<=10000)persist({...saved,have:{...saved.have,[r.product.id]:n}});}}/></label>{r.packs>0&&<Button size="small" variant="weak" onClick={()=>persist({...saved,have:{...saved.have,[r.product.id]:(saved.have[r.product.id]??0)+r.packs}})}>필요한 수량 준비했어요</Button>}</article>)}<p className="note">구매·배송 여부는 자동으로 확인되지 않아요. 준비한 수량을 직접 표시해 주세요.</p></section>}
 <footer><p>상품 데이터 {stamp} 반영 · 실시간 가격이 아니에요. 구매 전 판매처 가격과 배송비를 확인해 주세요.</p><p>이 기기에 식단과 장보기 상태를 저장해요. 앱 데이터 삭제나 기기 변경 시 복원되지 않을 수 있어요.</p><Button size="small" variant="weak" onClick={()=>void open('mailto:choisj2702@gmail.com?subject='+encodeURIComponent('[끼니플랜] 문의 및 이용 의견'))}>문의·이용 의견 보내기</Button>{saved&&<details open={reset} onToggle={e=>setReset(e.currentTarget.open)}><summary>저장한 식단 초기화</summary><p>이 기기의 추천 식단과 보유 수량을 모두 지워요.</p><Button size="small" color="danger" onClick={()=>{try{localStorage.removeItem(key);setSaved(null);setReset(false);go('setup');}catch{setError('초기화하지 못했어요.');}}}>초기화하기</Button></details>}</footer>
 </>}{busy&&<p role="status" className="status">🌱 예산에 맞는 메뉴를 고르고 있어요…</p>}{error&&<p role="alert" className="error">{error}</p>}</main>;
}
createRoot(document.getElementById('root')!).render(<TDSMobileAITProvider brandPrimaryColor="#568064"><App/></TDSMobileAITProvider>);
