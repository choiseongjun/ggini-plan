import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Button} from '@toss/tds-mobile';
import {TDSMobileAITProvider} from '@toss/tds-mobile-ait';
import {Device,User} from '@apps-in-toss/web-framework';
import {mealSchedule,slotLabels,MAX_PLAN_DAYS,type PlanProduct,type PlanConditions,type MealSlot} from '../../lib/shopping-plan';
import {excludedFoods,type ExcludedFood} from '../../lib/excluded-foods';
import {nutritionIsEstimated,servingNutrients} from '../../lib/serving-nutrients';
import {MealCompositionPicker} from '../../app/meal-composition-picker';
import {CookingEffortPicker} from '../../app/cooking-effort-picker';
import {ShoppingGoalPicker} from '../../app/shopping-goal-picker';
import {RiceBuddy} from '../../app/rice-buddy';
import {changeSlots,configurePlan,initialTossConditions,ingredientAmount,parseSaved,shoppingRows,storedStock,type Saved} from './model';
import {track} from './track';
import './style.css';

const hostOf=(url:string)=>{try{return new URL(url).hostname.replace(/^www\./,'');}catch{return 'invalid';}};
const won=(n:number)=>Math.round(n).toLocaleString('ko-KR')+'원';
const release='2026.10.07';
type Screen='setup'|'meals'|'cart';

function ProductPicture({product}:{product:PlanProduct}){
 const [failed,setFailed]=useState(false);
 return product.productImageUrl&&!failed?<img src={product.productImageUrl} alt="" loading="lazy" onError={()=>setFailed(true)}/>:<span className="emoji" aria-hidden="true">{product.emoji||'🍚'}</span>;
}
function Recipe({product,people,onOpen}:{product:PlanProduct;people:number;onOpen:(url:string)=>Promise<void>}){
 const [view,setView]=useState<'ingredients'|'method'>('ingredients');
 const recipe=product.recipe;
 if(!recipe)return null;
 const videoUrl=(name:string)=>'https://www.youtube.com/results?search_query='+encodeURIComponent(name.replace(/_/g,' ').replace(/\(.*?\)/g,'').trim()+' 만들기 레시피');
 return <div className="recipe-details">
  <div className="recipe-actions" role="group" aria-label="요리 정보"><button type="button" aria-pressed={view==='ingredients'} onClick={()=>setView('ingredients')}>재료 · {people}인분</button><button type="button" aria-pressed={view==='method'} onClick={()=>{setView('method');track.click('recipe_method_opened',{product_id:product.id});}}>조리법 보기</button></div>
  {view==='ingredients'?<ul className="ingredient-list">{recipe.ingredients.map((part,index)=><li key={`${part.product.id}-${index}`}><span>{part.product.name}{part.group&&<small>{part.group}</small>}</span><strong>{ingredientAmount(part.product,part.packs*people)}</strong></li>)}</ul>:<div><p className="note">아래 내용은 참고용 재료 구성 안내예요. 정식 조리법과 다를 수 있어 조리 영상의 방법과 안전한 익힘 상태를 확인해 주세요.</p><ol>{recipe.steps.map((step,index)=><li key={index}>{step}</li>)}</ol>{recipe.sides?.map((side,index)=><div className="side-recipe" key={`${side.name}-${index}`}><h3>{side.name}</h3><ol>{side.steps.map((step,i)=><li key={i}>{step}</li>)}</ol><Button size="small" variant="weak" onClick={()=>{track.click('recipe_video_clicked',{product_id:product.id,side:true});void onOpen(videoUrl(side.name));}}>반찬 조리 영상 찾기 ↗</Button></div>)}</div>}
  <Button display="block" variant="weak" onClick={()=>{track.click('recipe_video_clicked',{product_id:product.id});void onOpen(videoUrl(product.name));}}>YouTube에서 만드는 법 보기 ↗</Button>
  <p className="note">외부 YouTube 검색으로 이동해요. 영상의 재료와 분량은 이 목록과 다를 수 있어요.</p>
 </div>;
}
function App(){
 const [products,setProducts]=useState<PlanProduct[]>([]),[key,setKey]=useState(''),[stamp,setStamp]=useState('');
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[retry,setRetry]=useState(0);
 const [form,setForm]=useState<PlanConditions>(initialTossConditions),[saved,setSaved]=useState<Saved|null>(null),[screen,setScreen]=useState<Screen>('setup');
 const [step,setStep]=useState(0),[mealCap,setMealCap]=useState<number|null>(null),[day,setDay]=useState(1),[busy,setBusy]=useState(false),[reset,setReset]=useState(false);
 const [legacyStock,setLegacyStock]=useState<Record<string,number>>({});
 const worker=useRef<Worker|null>(null),jobTimer=useRef<ReturnType<typeof setTimeout>|null>(null),heading=useRef<HTMLHeadingElement>(null),[focus,setFocus]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();let active=true;const timer=setTimeout(()=>controller.abort(),15000);
  (async()=>{try{
   const response=await fetch('/catalog.json',{signal:controller.signal});if(!response.ok)throw new Error('메뉴 정보를 읽지 못했어요.');
   const catalog=await response.json();if(!Array.isArray(catalog.products)||!catalog.products.length)throw new Error('추천할 메뉴를 준비 중이에요.');
   const identity=import.meta.env.DEV?{hash:'local-preview'}:await Promise.race([User.getAnonymousKey(),new Promise<never>((_,reject)=>{if(controller.signal.aborted)reject(new Error('토스 연결을 확인해 주세요.'));else controller.signal.addEventListener('abort',()=>reject(new Error('토스 연결을 확인해 주세요.')),{once:true});})]);
   const storageKey='kkiniplan-toss-v1-'+identity.hash;
   const raw=localStorage.getItem(storageKey),restored=parseSaved(raw,catalog.products);
   if(active){
    setLegacyStock(storedStock(raw));setProducts(catalog.products);setStamp(String(catalog.exportedAt).slice(0,10));setKey(storageKey);
    if(restored){setSaved(restored);setForm(restored.conditions);setScreen('meals');setMealCap(restored.conditions.budget<1000000?Math.max(500,Math.min(50000,Math.round(restored.conditions.budget/(restored.conditions.meals*(restored.conditions.people??1))))):null);}
    track.event('app_opened',{restored:Boolean(restored),catalog:String(catalog.exportedAt).slice(0,10)});
    if(!restored&&raw)setNotice('메뉴 데이터가 새로워졌어요. 식단을 다시 추천받아 주세요. 기존 보유 수량은 같은 재료가 있으면 이어서 반영해요.');
    setLoading(false);setError('');
   }
  }catch(e){if(active){setError(e instanceof Error?e.message:'연결을 확인해 주세요.');setLoading(false);}}finally{clearTimeout(timer);}})();
  return()=>{active=false;clearTimeout(timer);controller.abort();};
 },[retry]);
 useEffect(()=>()=>{worker.current?.terminate();if(jobTimer.current)clearTimeout(jobTimer.current);},[]);
 // 화면·설정 단계가 바뀔 때마다 한 번 남긴다.
 useEffect(()=>{if(!loading&&key)track.screen(screen==='setup'?(step===0?'setup_meals':'setup_cooking'):screen==='meals'?'plan':'cart');},[screen,step,loading,key]);
 useEffect(()=>{if(focus){heading.current?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}},[focus]);
 function persist(next:Saved){try{localStorage.setItem(key,JSON.stringify(next));setSaved(next);setLegacyStock(next.have);setError('');return true;}catch{setError('기기에 저장할 공간이 부족해요. 저장 공간을 확인해 주세요.');return false;}}
 function go(next:Screen){setScreen(next);setFocus(n=>n+1);if(next==='setup')setStep(0);}
 function update(patch:Partial<PlanConditions>){setForm(current=>({...current,...patch}));}
 function nextStep(value:number){setStep(value);setFocus(n=>n+1);}
 function generate(index?:number){
  if(busy)return;
  const conditions=index===undefined?configurePlan(form,mealCap):saved?.conditions;
  if(!conditions){track.event('recommendation_failed',{reason:'invalid_conditions'});setError('끼니 수·인원과 한 끼 재료비 상한(500~50,000원)을 확인해 주세요.');return;}
  setBusy(true);setError('');worker.current?.terminate();
  const currentWorker=new Worker(new URL('./planner.worker.ts',import.meta.url),{type:'module'});worker.current=currentWorker;
  const finish=()=>{if(jobTimer.current)clearTimeout(jobTimer.current);jobTimer.current=null;currentWorker.terminate();worker.current=null;setBusy(false);};
  jobTimer.current=setTimeout(()=>{finish();track.event('recommendation_failed',{reason:'timeout',swap:index!==undefined});setError('계산이 오래 걸리고 있어요. 끼니 수를 줄여 다시 시도해 주세요.');},60000);
  currentWorker.onmessage=({data})=>{finish();if(!data.ids){track.event('recommendation_failed',{reason:'no_menu',swap:index!==undefined});setError(data.error??'조건에 맞는 메뉴가 부족해요. 끼니별 구성·조리 난이도·피할 재료 또는 재료비 상한을 바꿔 주세요.');return;}
   const next={conditions,ids:data.ids,have:saved?.have??legacyStock};
   track.event(index===undefined?'recommendation_completed':'menu_swapped',{meals:data.ids.length,people:conditions.people??1,days:mealSchedule(conditions).at(-1)?.day??1,cooking_effort:conditions.cookingEffort,goal:conditions.goal,excluded:conditions.excluded?.length??0,budget_cap:conditions.budget<1000000,...(index===undefined?{}:{from_product_id:saved?.ids[index],to_product_id:data.ids[index]})});if(persist(next)){setForm(conditions);setNotice('');if(index===undefined)setDay(1);go('meals');}};
  currentWorker.onerror=()=>{finish();track.event('recommendation_failed',{reason:'error',swap:index!==undefined});setError('추천 계산에 문제가 생겼어요. 다시 시도해 주세요.');};currentWorker.postMessage({products,conditions,ids:saved?.ids,index});
 }
 async function open(url:string){try{const parsed=new URL(url);if(!['https:','mailto:'].includes(parsed.protocol))throw new Error();if(import.meta.env.DEV)window.open(url,'_blank','noopener,noreferrer');else await Device.openURL(url);}catch{setError('링크를 열지 못했어요. 잠시 후 다시 시도해 주세요.');}}
 const allRows=saved?shoppingRows(saved,products):[];
 const rows=allRows.filter(row=>row.product.price>0),pantry=allRows.filter(row=>row.product.price===0);
 const materialTotal=rows.reduce((sum,row)=>sum+row.cost,0),purchaseTotal=rows.reduce((sum,row)=>sum+row.packs*row.product.price,0);
 const slots=form.slots??['breakfast','lunch','dinner'],days=form.days??7;
 const schedule=saved?mealSchedule(saved.conditions):[],people=saved?.conditions.people??1;
 const productsById=new Map(products.map(product=>[product.id,product]));
 const planDays=schedule.at(-1)?.day??1;
 const links=(product:PlanProduct)=><div className="links">{product.productUrl&&<Button size="small" variant="weak" onClick={()=>{track.click('seller_link_clicked',{product_id:product.id,host:hostOf(product.productUrl!)});void open(product.productUrl!);}}>판매처 보기 ↗</Button>}<Button size="small" variant="weak" onClick={()=>{track.click('price_search_clicked',{product_id:product.id});void open('https://search.shopping.naver.com/search/all?query='+encodeURIComponent(product.name));}}>재료 가격 검색 ↗</Button></div>;
 return <main>
  <header><img src="/icon.png" alt=""/><div><strong>끼니플랜</strong><span>내 생활에 맞춰 챙기는 한 끼</span></div></header>
  {loading?<p role="status">🌱 메뉴를 준비하고 있어요…</p>:!products.length||!key?<Button onClick={()=>{setLoading(true);setRetry(n=>n+1);}}>다시 불러오기</Button>:<>
   <nav aria-label="끼니플랜 메뉴"><Button variant={screen==='setup'?'fill':'weak'} disabled={busy} onClick={()=>go('setup')}>식단 설정</Button><Button variant={screen==='meals'?'fill':'weak'} disabled={!saved||busy} onClick={()=>go('meals')}>추천 식단</Button><Button variant={screen==='cart'?'fill':'weak'} disabled={!saved||busy} onClick={()=>go('cart')}>장보기</Button></nav>
   {notice&&<p className="notice" role="status">{notice}</p>}
   {screen==='setup'&&<section>
    <div className="setup-intro"><RiceBuddy/><div><p className="eyebrow">끼니와 함께 · {step+1} / 2</p><h1 ref={heading} tabIndex={-1}>{step===0?'어떤 끼니를 챙길까요?':'요리는 어느 정도가 좋아요?'}</h1><p>{step===0?'챙기고 싶은 끼니를 모두 골라주세요.':'오늘 할 수 있는 만큼만 골라요.'}</p></div></div>
    <form onSubmit={event=>{event.preventDefault();if(step===0)nextStep(1);else generate();}}><fieldset disabled={busy}>
     {step===0?<>
      <fieldset className="segment-options"><legend>챙길 끼니</legend><div>{(Object.keys(slotLabels) as MealSlot[]).map(slot=><button type="button" key={slot} aria-pressed={slots.includes(slot)} onClick={()=>setForm(changeSlots(form,slots.includes(slot)?slots.filter(value=>value!==slot):[...slots,slot].sort((a,b)=>Object.keys(slotLabels).indexOf(a)-Object.keys(slotLabels).indexOf(b))))}>{slotLabels[slot]}</button>)}</div></fieldset>
      <p className="note">{days}일 · {slots.map(slot=>slotLabels[slot]).join('·')} · 총 {form.meals}끼. 밖에서 먹는 끼니는 빼 주세요.</p>
      <Button display="block" type="submit">다음 →</Button>
     </>:<>
      <CookingEffortPicker value={form.cookingEffort} onChange={cookingEffort=>update({cookingEffort})} disabled={busy}/>
      <details><summary>더 맞춰볼까요? · 식사 구성·목표</summary><MealCompositionPicker conditions={form} onChange={mealSideCounts=>update({mealSideCounts})} disabled={busy}/><ShoppingGoalPicker value={form.goal} onChange={goal=>update({goal})} settings={false} disabled={busy}/></details>
      <details><summary>끼니 수·인원·재료비 설정</summary>
       <fieldset className="segment-options"><legend>몇 끼 준비할까요?</legend><div>{[3,5,7].map(meals=><button type="button" key={meals} aria-pressed={form.meals===meals} onClick={()=>update({mealCountMode:true,meals,days:Math.ceil(meals/slots.length)})}>{meals}끼</button>)}</div></fieldset>
       <label>끼니 수 직접 입력<input type="number" min={1} max={MAX_PLAN_DAYS*slots.length} step={1} inputMode="numeric" value={form.meals} onChange={event=>{const meals=Math.max(1,Math.min(MAX_PLAN_DAYS*slots.length,Math.round(Number(event.target.value))||1));update({mealCountMode:true,meals,days:Math.ceil(meals/slots.length)});}}/></label>
       <fieldset className="segment-options"><legend>몇 명이 먹나요?</legend><div>{[1,2,3,4].map(value=><button type="button" key={value} aria-pressed={(form.people??1)===value} onClick={()=>update({people:value})}>{value}명</button>)}</div></fieldset>
       <label>한 끼 재료비 상한 · 1인분 (선택)<input type="number" inputMode="numeric" min={500} max={50000} step={1} placeholder="제한 없음" value={mealCap??''} onChange={event=>setMealCap(event.target.value===''?null:Number(event.target.value))}/></label>
       <p className="note">식단 전체의 평균 재료비 기준이에요. 포장 단위 구매금액·배송비와 다르며, 일부 끼니는 입력한 금액보다 높을 수 있어요.</p>
      </details>
      <details><summary>피할 재료 · {form.excluded?.length??0}개</summary><div className="choices">{Object.entries(excludedFoods).map(([name,label])=><label key={name}><input type="checkbox" checked={form.excluded?.includes(name as ExcludedFood)??false} onChange={event=>update({excluded:event.target.checked?[...form.excluded??[],name as ExcludedFood]:(form.excluded??[]).filter(value=>value!==name)})}/>{label}</label>)}</div><p className="note">등록된 재료 정보로 걸러요. 알레르기가 있다면 구매 전 포장 표시도 확인해 주세요.</p></details>
      <p className="note">{form.people??1}명 · {form.meals}끼를 준비해요. 영양값·재료 가격은 추정치이며 의료·영양 처방이 아니에요.</p>
      <Button type="submit" display="block" loading={busy}>내 식단 추천받기</Button><button className="back-link" type="button" onClick={()=>nextStep(0)}>← 끼니 다시 고르기</button>
     </>}
    </fieldset></form>
   </section>}
   {screen==='meals'&&saved&&<section>
    <p className="eyebrow">🍚 오늘도 한 끼</p><h1 ref={heading} tabIndex={-1}>이렇게 먹어요</h1><p>{people}명 · {saved.ids.length}끼 식단</p>
    <div className="days" aria-label="식단 날짜">{Array.from({length:planDays},(_,index)=><Button size="small" variant={day===index+1?'fill':'weak'} key={index} aria-pressed={day===index+1} onClick={()=>setDay(index+1)}>{index+1}일차</Button>)}</div>
    {saved.ids.map((id,index)=>{const when=schedule[index],product=productsById.get(id);if(!product||when.day!==day)return null;
     const nutrients=servingNutrients(product),estimated=nutritionIsEstimated(product)||id.startsWith('recipe-opt-');
     const cost=product.recipe?product.recipe.ingredients.reduce((sum,part)=>sum+part.product.price*part.packs,0):product.price/product.servings;
     return <article key={`${index}-${id}`}><p className="eyebrow">{when.day}일차 · {slotLabels[when.slot]} · 직접 요리</p><div className="product"><ProductPicture product={product}/><h2>{product.name.replace(/_/g,' ')}</h2></div>
      <strong className="price">1인분 재료비 약 {won(cost)}</strong><p className="note">1인분 영양{estimated?' · 추정값 포함':''}</p><dl className="nutrition-grid">{([['열량',nutrients.calories,'kcal'],['단백질',nutrients.protein,'g'],['탄수화물',nutrients.carbs,'g'],['지방',nutrients.fat,'g'],['나트륨',nutrients.sodium,'mg']] as const).map(([label,value,unit])=><div key={label}><dt>{label}</dt><dd>{value===null?'미확인':`${Math.round(value*10)/10}${unit}`}</dd></div>)}</dl>
      <Recipe product={product} people={people} onOpen={open}/><Button size="small" variant="weak" disabled={busy} onClick={()=>generate(index)}>다른 메뉴로 바꾸기 ↻</Button>
     </article>;
    })}
    <Button display="block" onClick={()=>go('cart')} disabled={busy}>장보기 목록 보기</Button><div className="plan-actions"><Button variant="weak" disabled={busy} onClick={()=>go('setup')}>조건 바꾸기</Button><Button variant="weak" disabled={busy} onClick={()=>generate()}>다른 식단 추천</Button></div>
   </section>}
   {screen==='cart'&&saved&&<section>
    <p className="eyebrow">🧺 겹치는 재료는 한 번에</p><h1 ref={heading} tabIndex={-1}>나의 장보기</h1>
    <div className="summary"><span>{people}명 · 추가 구매 예상</span><strong>{won(purchaseTotal)}</strong><small>포장 단위 구매 추정 · 배송비 별도</small><small>추가 필요한 사용량의 재료비 약 {won(materialTotal)}</small></div><p className="note">메뉴의 재료비는 사용하는 양 기준이고, 장보기 금액은 남은 재료를 포장 단위로 구매하는 기준이에요. 표준가·추정 소매가로 계산하여 실제 판매 가격과 다를 수 있어요.</p>
    {rows.map(row=><article key={row.product.id}><div className="product"><ProductPicture product={row.product}/><h2>{row.product.name}</h2></div><p>{row.product.detail}</p><strong>{row.packs?`${row.packs}묶음 추가 · 약 ${won(row.packs*row.product.price)}`:'준비했어요 ✓'}</strong><p className="note">{people}명 식단에 {ingredientAmount(row.product,row.required)} 사용 · 보유 {saved.have[row.product.id]??0}묶음</p>{links(row.product)}<label>구매했거나 집에 있는 수량 (묶음)<input type="number" inputMode="decimal" min={0} max={10000} step="any" value={saved.have[row.product.id]??0} onChange={event=>{const quantity=Number(event.target.value);if(Number.isFinite(quantity)&&quantity>=0&&quantity<=10000)persist({...saved,have:{...saved.have,[row.product.id]:quantity}});}}/></label>{row.packs>0&&<Button size="small" variant="weak" onClick={()=>{track.click('item_prepared',{product_id:row.product.id,packs:row.packs});persist({...saved,have:{...saved.have,[row.product.id]:Math.min(10000,(saved.have[row.product.id]??0)+row.packs)}});}}>필요한 수량 준비했어요</Button>}</article>)}
    {pantry.length>0&&<details><summary>집에 있다고 가정한 기본 양념 {pantry.length}개</summary><ul>{pantry.map(row=><li key={row.product.id}>{row.product.name} · {ingredientAmount(row.product,row.required)}</li>)}</ul><p className="note">위 양념은 예상 금액에서 제외했어요. 없다면 별도로 준비해 주세요.</p></details>}<p className="note">구매·배송은 자동 확인되지 않아요. 준비한 수량을 직접 표시해 주세요.</p>
   </section>}
   <footer><p>메뉴 데이터 {stamp} 반영 · 앱 버전 {release}</p><p>정부 식품영양성분DB의 영양값을 참고해 구성한 유사 레시피예요. 정식 조리법이 아니며 재료비·영양값은 추정치입니다.</p><p>식단과 보유 수량은 이 기기에 저장해요. 데이터 삭제나 기기 변경 시 복원되지 않을 수 있어요.</p><Button size="small" variant="weak" onClick={()=>{track.click('feedback_clicked');void open('mailto:choisj2702@gmail.com?subject='+encodeURIComponent('[끼니플랜 앱인토스] 문의 및 이용 의견'));}}>문의·이용 의견</Button>
    {(saved||Object.keys(legacyStock).length>0)&&<details open={reset} onToggle={event=>setReset(event.currentTarget.open)}><summary>저장한 식단 초기화</summary><p>이 기기의 식단과 보유 수량을 모두 지워요. 실제 주문은 취소되지 않아요.</p><Button size="small" color="danger" onClick={()=>{track.click('plan_reset');try{localStorage.removeItem(key);setLegacyStock({});setSaved(null);setForm(initialTossConditions);setMealCap(null);setReset(false);setNotice('');go('setup');}catch{setError('초기화하지 못했어요.');}}}>초기화하기</Button></details>}
   </footer>
  </>}{busy&&<p role="status" className="status">🌱 식단을 짜고 있어요…</p>}{error&&<p role="alert" className="error">{error}</p>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<TDSMobileAITProvider brandPrimaryColor="#568064"><App/></TDSMobileAITProvider>);
