'use client';
import type {DailyNutritionReference} from '../lib/daily-nutrition-reference';
import {usePlannerLocale} from './planner-locale';
import {trackPlanner} from '../lib/track-planner';
import {MealPlanOverview} from './meal-plan-overview';
import {MealComparison} from './meal-comparison';
import {MenuPickerModal} from './menu-picker-modal';
import {EatLogPanel} from './eat-log-panel';
import {SnackLog} from './snack-log';
import type {IntakeExtra} from '../lib/intake-extras';
import {MealPhotoLog,PhotoLogSummary,type PhotoLogResult} from './meal-photo-log';
import {BadgeToast,INTAKE_LOGGED_EVENT,StreakChip,useIntakeStats} from './record-progress';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import type {useFoodIntake} from './food-intake';
import {ProductThumb} from './product-thumb';
import {mealCalorieParts} from '../lib/serving-nutrients';
import {RecipeProductPreview} from './meal-source';
import {RecipeVideos} from './recipe-videos';
import {availablePortions,servingNutrition} from '../lib/food-intake';
import {ProductNutrition,DailyRecommendationNutrition} from './recommendation-nutrition';
import {purchaseBasket,swapReasons,visibleSwapReasons,type SwapReason,slotLabels,type PlanProduct,type PlanConditions,mealSchedule} from '../lib/shopping-plan';
import {planDay,planDate,recordedForSlot} from '../lib/daily-plan';
import {addDays,type DashboardData} from '../lib/dashboard';
import {ShoppingProgress,type useShoppingProgress} from './shopping-progress';
import './today-meals.css';
import {recommendationReasons} from '../lib/plan-explanation';

function MealSection({title,meta,open,onToggle,children}:{title:string;meta?:string;open:boolean;onToggle:()=>void;children:React.ReactNode}){
 return <div className={`meal-section${open?' is-open':''}`}>
  <button type="button" className="meal-section-head" aria-expanded={open} onClick={onToggle}><span>{title}</span>{meta&&<small>{meta}</small>}<i aria-hidden="true"/></button>
  {open&&<div className="meal-section-body">{children}</div>}
 </div>;
}
const amount=(n:number)=>n.toLocaleString('ko-KR',{maximumFractionDigits:1});
export function TodayMeals({focusMeal=null,overviewOpen,onOverviewOpen,nutritionReference,shoppingTotal,intake,userId,onLogin,ids,products,conditions,startDate,onStartDate,onSwap,onChoose,progress,dailyCalories,dashboard,perMealCalories}:{focusMeal?:number|null;nutritionReference?:DailyNutritionReference;shoppingTotal:number;intake:ReturnType<typeof useFoodIntake>;userId?:string;onLogin:()=>void;ids:string[];products:PlanProduct[];conditions:PlanConditions;startDate:string;onStartDate:(date:string)=>void;onSwap:(index:number,reason?:SwapReason)=>void;onChoose:(index:number,id:string)=>void;progress:ReturnType<typeof useShoppingProgress>;dailyCalories:number|null;perMealCalories?:number|null;dashboard?:DashboardData|null;overviewOpen?:boolean;onOverviewOpen?:(open:boolean)=>void}){
 const locale=usePlannerLocale();
 const won=locale.money;
 const {today,current,totals}=intake;
 const schedule=mealSchedule(conditions);
 const days=conditions.days??Math.max(1,...schedule.map(s=>s.day));
 const active=planDay(startDate,today,days);
 const [chosenDay,setChosenDay]=useState<number|null>(null);
 // 알림에서 들어온 끼니는 기록 패널을 연 채로 시작한다(알림 → 먹었어요, 두 번이면 끝).
 const [logging,setLogging]=useState<number|null>(focusMeal);
 useEffect(()=>{if(focusMeal===null)return;const card=document.getElementById(`today-meal-${focusMeal}`);card?.scrollIntoView({block:'center'});card?.focus({preventScroll:true});},[focusMeal]);
 // Each card shows its sections (재료·영상·메뉴 바꾸기·영양) as titled rows that open independently.
 const [openSections,setOpenSections]=useState<Set<string>>(()=>new Set());
 const isSection=(index:number,key:string)=>openSections.has(`${index}:${key}`);
 const toggleSection=(index:number,key:string)=>setOpenSections(prev=>{const next=new Set(prev),k=`${index}:${key}`;if(next.has(k))next.delete(k);else next.add(k);return next;});
 const {stats,newBadges,dismissBadges}=useIntakeStats(userId);
 const [photoResults,setPhotoResults]=useState<Record<number,Extract<PhotoLogResult,{logged:true}>>>({});
 async function undoPhoto(index:number){
  const r=photoResults[index];if(!r)return;
  for(const id of r.ids)if(!await intake.send({action:'undo',id,version:intake.current?.version??0}))return;
  setPhotoResults(all=>{const next={...all};delete next[index];return next;});
 }
 // 사진 기록 고치기: 고친 양으로 새로 기록한 뒤 사진 기록을 지운다(중간에 실패해도 기록이 사라지지 않게 이 순서로).
 const [editingPhoto,setEditingPhoto]=useState<number|null>(null);
 async function correctPhoto(index:number,productId:string,portions:number,extras:IntakeExtra[]){
  const r=photoResults[index];if(!r)return;
  if(!await intake.log(productId,portions,extras))return;
  for(const id of r.ids)if(!await intake.send({action:'undo',id,version:intake.current?.version??0}))break;
  setPhotoResults(all=>{const next={...all};delete next[index];return next;});setEditingPhoto(null);
 }
 const [managing,setManaging]=useState<number|null>(null),[purchaseMessage,setPurchaseMessage]=useState('');
 const [browsing,setBrowsing]=useState<number|null>(null);
 const day=chosenDay!==null&&chosenDay<=days?chosenDay:active.day;
 const date=planDate(startDate,day),isToday=date===today;
 const entries=ids.flatMap((id,index)=>{const product=products.find(p=>p.id===id);return product&&schedule[index]?.day===day?[{product,index,slot:schedule[index].slot}]:[];});
 const weeklySpent=dashboard?.expenses.filter(e=>e.category==='food'&&e.date>=dashboard.week&&e.date<addDays(dashboard.week,7)).reduce((sum,e)=>sum+e.amount,0);
 const mealCost=current?.logs.reduce((sum,log)=>sum+(log.cost??0),0)??0;
 const missingCost=current?.logs.some(log=>log.cost==null);
 const disabled=intake.disabled||progress.busy||!progress.ready;
 const todayDay=planDate(startDate,active.day)===today?active.day:null;
 const todayIds=todayDay===null?[]:ids.flatMap((id,index)=>schedule[index]?.day===todayDay?[{id,index}]:[]);
 const eatenToday=new Set(todayIds.flatMap(({id,index},entryIndex)=>{const portions=current?.logs.filter(l=>l.productId===id).reduce((sum,l)=>sum+l.portions,0)??0;return recordedForSlot(todayIds.map(e=>e.id),entryIndex,portions)>=1?[index]:[];}));
 return locale.render(<section className="today-meals" aria-label="오늘의 식사와 식비">
  <header><span className="section-kicker">내 식사에서 건강을 찾다 🍚</span><h2>{userId?'오늘 필요한 영양, 가볍게 챙겨요':'내게 맞는 한 끼, 매일 꺼내 먹어요'}</h2><p>{conditions.people??1}명 전체 장보기 · 영양정보는 1인분 기준이에요. ‘먹었어요’는 내가 먹은 양만 기록해요.</p></header>
  {userId?<details className="today-record-summary"><summary>오늘의 영양·식비 기록 보기 🌱</summary>
   <div className="today-metrics">
    <article><span>오늘 섭취 칼로리</span><strong>{totals?amount(totals.calories):'—'} <small>kcal</small></strong>{dailyCalories?<small>하루 참고량 {amount(dailyCalories)} kcal</small>:!locale.isTaiwan&&<Link href="/profile#profile-settings">내 필요 열량 설정 →</Link>}{!!totals?.missingCalories&&<small>미확인 {totals.missingCalories}건 별도</small>}</article>
    <article><span>오늘 섭취 단백질</span><strong>{totals?amount(totals.protein):'—'} <small>g</small></strong><small>상품 표시 · 요리는 재료 합산 예상</small>{!!totals?.missingProtein&&<small>미확인 {totals.missingProtein}건 별도</small>}</article>
    <article><span>오늘 먹은 음식 비용</span><strong>{current?won(mealCost):'—'}</strong><small>기록 시 등록 가격 기준 · 예상{missingCost?' · 금액 미확인 기록 별도':''}</small></article>
    {!locale.isTaiwan&&<article><span>이번 주 기록한 식비</span><strong>{weeklySpent===undefined?'—':won(weeklySpent)}</strong>{dashboard?.budget?<small>주간 예산 {won(dashboard.budget)} · {weeklySpent!>dashboard.budget?`${won(weeklySpent!-dashboard.budget)} 초과`:`${won(dashboard.budget-weeklySpent!)} 남음`}</small>:<Link href="/record">식비·예산 기록하기 →</Link>}<small>구매 시 기록한 금액 + 직접 입력한 지출</small></article>}
   </div>
   {current&&!current.logs.length&&<p className="today-note">첫 끼를 기록해 보세요. 아래 메뉴의 ‘먹었어요’를 누르면 여기에 쌓여요.</p>}
   <Link href="/record">먹은 기록·식비 자세히 보기 →</Link>
  </details>:<p className="today-note">비회원도 추천과 구매 상태를 이어서 볼 수 있어요. <button type="button" onClick={onLogin}>로그인하고 영양 기록 남기기 →</button></p>}
  {intake.loading&&<p role="status">오늘 기록을 불러오는 중…</p>}
  {intake.error&&<p role="alert">{intake.error} <button type="button" disabled={intake.busy} onClick={()=>intake.pending?void intake.send(intake.pending):intake.reload()}>다시 확인</button></p>}
  {intake.message&&<p role="status">{intake.message}</p>}
  {purchaseMessage&&<p role="status">{purchaseMessage}</p>}
  {ids.length>0?<>
   <div className="today-title"><h3 tabIndex={-1} data-recommended-menu-heading>{isToday?'오늘 이렇게 먹어요':`${day}일차 이렇게 먹어요`}</h3>{userId&&<StreakChip stats={stats}/>}<span>{date.slice(5).replace('-','/')}</span></div>
   <MealPlanOverview ids={ids} products={products} conditions={conditions} startDate={startDate} shoppingTotal={shoppingTotal} onSwap={onSwap} locked={eatenToday} disabled={disabled} open={overviewOpen} onOpenChange={onOverviewOpen} onMeal={(n,index)=>{setChosenDay(n);setManaging(null);setBrowsing(null);requestAnimationFrame(()=>requestAnimationFrame(()=>{const card=document.getElementById(`today-meal-${index}`);card?.scrollIntoView({behavior:'smooth',block:'start'});card?.focus({preventScroll:true});}));}}/>
   <label className="today-start">식단 시작일<input type="date" value={startDate} onChange={e=>{if(e.target.value){onStartDate(e.target.value);setChosenDay(null);setManaging(null);setBrowsing(null);}}}/></label>
   {!active.active&&<p className="today-note">{today<startDate?'아직 시작 전인 식단이에요.':'이 식단의 일정이 끝났어요.'} 시작일을 바꾸거나 새로 추천받을 수 있어요.</p>}
   <nav className="today-days" aria-label="준비한 식단 날짜">{Array.from({length:days},(_,i)=>i+1).map(n=><button type="button" key={n} aria-pressed={n===day} onClick={()=>{setChosenDay(n);setManaging(null);setBrowsing(null);}}><strong>{planDate(startDate,n)===today?'오늘':planDate(startDate,n)===addDays(today,1)?'내일':`${n}일차`}</strong><small>{planDate(startDate,n).slice(5).replace('-','/')}</small></button>)}</nav>
   <div className="today-menu-list">{entries.map(({product:p,index,slot},entryIndex)=>{
    const owned=intake.products.find(i=>i.id===p.id);
    const parts=purchaseBasket([p.id],products,[],{});
    const orderedParts=parts.map(r=>progress.stock[r.product.id]).filter(s=>s&&s.ordered>0);
    const portions=isToday?(current?.logs.filter(l=>l.productId===p.id).reduce((sum,l)=>sum+l.portions,0)??0):0;
    const recorded=recordedForSlot(entries.map(e=>e.product.id),entryIndex,portions);
    // Any logged portion counts: the 먹었어요 panel records the actual amount (반·1.5인분 …) in one entry.
    const done=recorded>0,canEat=owned&&owned.available>=0.25;
    const kcal=servingNutrition(p).calories,kcalParts=mealCalorieParts(p);
    return <article key={index} id={`today-meal-${index}`} tabIndex={-1} className={done?'today-menu done':'today-menu'}>
     <div className="today-menu-label"><span className="meal-slot">{slot==='breakfast'?'☀️':slot==='lunch'?'🌤️':'🌙'} {slotLabels[slot]}</span><b className={`meal-status${done?' is-done':''}`}>{done?'먹었어요 ✓':availablePortions(progress.stock,p)>=1?'집에 있어요':orderedParts.length?'배송 기다리는 중':'구매 전'}</b></div>
     <div className="today-product"><ProductThumb item={p} zoomable/><div className="today-menu-toggle-text"><span className="today-menu-name">{p.name.split('_').join(' · ')}</span><span className="today-menu-price">{p.recipe?'재료비':'한 끼'} 약 <b>{won(p.price/p.servings)}</b></span></div></div>
     {kcal!==null&&<div className="meal-kcal"><div className="meal-kcal-total"><b>{Math.round(kcal).toLocaleString('ko-KR')}</b><span>kcal</span><small>한 끼</small></div>{kcalParts.rice&&<p className="meal-kcal-line"><span>{p.name.split('_')[0]} 1인분{kcalParts.dish.grams!==null?` (약 ${kcalParts.dish.grams}g)`:''}</span> <b>{Math.round(kcalParts.dish.kcal??0)}</b> + <span>밥 한 공기</span> <b>{Math.round(kcalParts.rice.kcal)}</b></p>}</div>}
     <div className="meal-sections">
      {p.recipe?<MealSection title="재료" meta={`${p.recipe.ingredients.filter(i=>!i.group).length}가지`} open={isSection(index,'ing')} onToggle={()=>toggleSection(index,'ing')}><RecipeProductPreview product={p} videos={false}/></MealSection>
       :<MealSection title="상품 정보" open={isSection(index,'ing')} onToggle={()=>toggleSection(index,'ing')}><div className="today-product-links">
      {p.productUrl&&<a href={p.productUrl} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} 판매 상품 보기 (새 창)`}>🛍️ 판매 상품 보기 ↗</a>}
      <a href={locale.search(p.name)} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} 네이버쇼핑에서 가격 검색 (새 창)`}>다른 판매처 가격 검색 ↗</a>
     </div></MealSection>}
      {p.recipe&&!p.recipe.assembly&&<MealSection title="만드는 방법 영상" meta="YouTube" open={isSection(index,'video')} onToggle={()=>toggleSection(index,'video')}><RecipeVideos dishId={p.id}/></MealSection>}
      {!done&&<MealSection title="메뉴 바꾸기" open={isSection(index,'swap')} onToggle={()=>toggleSection(index,'swap')}>
     {!done&&<div className="today-edit" role="group" aria-label={`${slotLabels[slot]} 메뉴 수정`}><button type="button" disabled={disabled} aria-haspopup="dialog" onClick={()=>setBrowsing(index)}>🔎 메뉴 직접 고르기</button><button type="button" disabled={disabled} onClick={()=>{setManaging(null);setBrowsing(null);onSwap(index);}}>🔀 바로 바꾸기</button></div>}
     {!done&&<details className="swap-reasons"><summary>이유를 고르고 교체하기</summary><p>다음 추천에도 반영해요. 이유 없이 바꾸려면 ‘바로 바꾸기’를 누르세요.</p><div>{visibleSwapReasons.map(reason=><button type="button" key={reason} disabled={disabled} onClick={()=>{setManaging(null);onSwap(index,reason);}}>{swapReasons[reason]}</button>)}</div></details>}
     {!locale.isTaiwan&&<MealComparison key={p.id.split('--with--')[0]} product={p} index={index} ids={ids} products={products} conditions={conditions} onChoose={onChoose} disabled={disabled||done}/>}
      </MealSection>}
      <MealSection title="영양정보 · 추천 이유" meta={kcal!==null?`한 끼 약 ${Math.round(kcal)}kcal`:undefined} open={isSection(index,'nutri')} onToggle={()=>toggleSection(index,'nutri')}>
     {!locale.isTaiwan&&<p className="recommendation-reasons">{recommendationReasons(p,conditions,perMealCalories??null).join(' · ')}</p>}
       <ProductNutrition product={p}/>
      </MealSection>
     </div>
     {photoResults[index]&&editingPhoto!==index&&<PhotoLogSummary result={photoResults[index]} streak={stats?.streak.loggedToday?stats.streak.current:null} busy={intake.busy} onUndo={()=>void undoPhoto(index)} onEdit={()=>setEditingPhoto(index)}/>}
     {photoResults[index]&&editingPhoto===index&&<EatLogPanel product={p} stockAvailable={0} disabled={intake.busy} title="먹은 양 고치기" submitLabel="이대로 고치기" initial={{portions:photoResults[index].portion,extras:photoResults[index].extras}} onClose={()=>setEditingPhoto(null)} onSubmit={({portions,extras})=>void correctPhoto(index,p.id,portions,extras)}/>}
     {userId&&!done&&<MealPhotoLog productId={p.id} dishName={p.name} disabled={disabled||!isToday} onLogged={r=>{setPhotoResults(all=>({...all,[index]:r}));setLogging(null);intake.reload();window.dispatchEvent(new CustomEvent(INTAKE_LOGGED_EVENT));trackPlanner('photo_logged');if(index===focusMeal)trackPlanner('push_logged');}} onFallback={()=>void intake.log(p.id,1,[])} onManual={()=>setLogging(logging===index?null:index)}/>}
     <div className="today-actions">{done?(!photoResults[index]&&<Link href="/record">기록 확인·취소 →</Link>):!userId?<button type="button" onClick={onLogin}>로그인하고 먹었어요 기록</button>:!canEat&&(orderedParts.length>0?<button type="button" disabled={disabled} onClick={()=>void progress.update(orderedParts.map(item=>({item,quantity:item.ordered})),'receive')}>받았어요 ({orderedParts.reduce((n,s)=>n+s.ordered,0)}묶음)</button>:<button type="button" disabled={disabled} aria-expanded={managing===index} onClick={()=>{setManaging(managing===index?null:index);setPurchaseMessage('');}}>구매·보유 등록</button>)}</div>
     {logging===index&&!done&&<EatLogPanel product={p} stockAvailable={owned?Math.floor(owned.available*4)/4:0} disabled={disabled||!isToday} onClose={()=>setLogging(null)} onSubmit={({portions,extras,deduct})=>{void intake.log(p.id,portions,extras,deduct?owned:undefined).then(ok=>{if(ok){setLogging(null);if(index===focusMeal)trackPlanner('push_logged');}});}}/>}
     {userId&&canEat&&!done&&<small className="today-left">집에 남은 음식 {amount(owned.available)}회분</small>}
     {managing===index&&<div className="today-purchase-panel">
      <div className="today-purchase-heading"><strong>{p.recipe?'이 끼니의 재료를 등록해요':'이 음식만 등록해요'}</strong><button type="button" disabled={progress.busy} onClick={()=>setManaging(null)}>닫기</button></div>
      <ShoppingProgress key={p.id} single={!p.recipe} restrictToItems guest={locale.isTaiwan||!userId} progress={{...progress,update:async(changes,action,expense)=>{const ok=await progress.update(changes,action,expense);if(ok){setManaging(null);setPurchaseMessage(expense?'구매 상태와 식비를 함께 기록했어요.':'이 음식의 구매·보유 상태를 반영했어요.');}return ok;}}} items={parts.map(r=>({id:r.product.id,name:r.product.name,unit:'묶음',required:r.required*(1-recorded),packSize:1,url:r.product.productUrl,price:r.product.price,detail:r.product.detail}))} summary={<p className="today-note">지금 고른 음식의 수량만 반영해요. 실제 구매한 묶음 수로 조절해 주세요.</p>}/>
     </div>}
     {!isToday&&<small>먹은 기록은 오늘 날짜의 메뉴에서 남겨 주세요.</small>}{recorded>0&&!done&&<small>오늘 {recorded}회분 기록했어요. 나머지를 드셨다면 먹었어요를 눌러 주세요.</small>}
    </article>;
   })}</div>
   {userId&&isToday&&<SnackLog onLogged={()=>intake.reload()}/>}
   <DailyRecommendationNutrition products={entries.map(e=>e.product)} reference={nutritionReference??null}/>
   <BadgeToast badges={newBadges} onClose={dismissBadges}/>
   <MenuPickerModal index={browsing} ids={ids} products={products} conditions={conditions} onChoose={onChoose} onClose={()=>setBrowsing(null)} disabled={disabled}/>
   <p className="today-note">한 끼 비용은 간편식의 회분 가격 또는 직접 요리에 쓰는 재료비예요. 실제 결제·배송비와 다를 수 있어요.</p>
  </>:<div className="today-empty">아래에서 예산과 챙길 끼니를 고르면, 오늘 먹을 메뉴부터 준비해 드려요.</div>}
 </section>);
}
