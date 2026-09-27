'use client';
import {MealActionFlow} from './meal-action-flow';
import {MealTableIllustration} from './meal-composition-picker';
import {trackAnalytics} from '../lib/analytics';
import type {DailyNutritionReference} from '../lib/daily-nutrition-reference';
import {usePlannerLocale} from './planner-locale';
import {MealPlanOverview} from './meal-plan-overview';
import {MealAlternatives} from './meal-alternatives';
import {MenuPickerModal} from './menu-picker-modal';
import {MealRecordAccordion} from './meal-record-accordion';
import {SideDishSuggest} from './side-dish-suggest';
import {sideFit} from '../lib/side-pairing';
import {BadgeToast,StreakChip,useIntakeStats} from './record-progress';
import {useEffect,useId,useState} from 'react';
import Link from 'next/link';
import type {useFoodIntake} from './food-intake';
import {MealPhotoGallery,MealCompositionPhotos} from './meal-photo-gallery';
import {mealCalorieParts} from '../lib/serving-nutrients';
import {RecipeProductPreview} from './meal-source';
import {RecipeVideos} from './recipe-videos';
import {NearbyRestaurants} from './nearby-restaurants';
import {availablePortions,servingNutrition} from '../lib/food-intake';
import {ProductNutrition,DailyRecommendationNutrition} from './recommendation-nutrition';
import {purchaseBasket,type SwapReason,slotLabels,type PlanProduct,type PlanConditions,type MealSlot,mealSchedule} from '../lib/shopping-plan';
import {planDay,planDate,recordedForSlot} from '../lib/daily-plan';
import {addDays,type DashboardData} from '../lib/dashboard';
import type {useShoppingProgress} from './shopping-progress';
import './today-meals.css';
import {recommendationReasons} from '../lib/plan-explanation';

function MealSection({title,meta,open,onToggle,children}:{title:string;meta?:string;open:boolean;onToggle:()=>void;children:React.ReactNode}){
 return <div className={`meal-section${open?' is-open':''}`}>
  <button type="button" className="meal-section-head" aria-expanded={open} onClick={onToggle}><span>{title}</span>{meta&&<small>{meta}</small>}<i aria-hidden="true"/></button>
  {open&&<div className="meal-section-body">{children}</div>}
 </div>;
}
const amount=(n:number)=>n.toLocaleString('ko-KR',{maximumFractionDigits:1});
export function TodayMeals({onAllMeals,focusMeal=null,overviewOpen,onOverviewOpen,nutritionReference,shoppingTotal,intake,userId,onLogin,ids,products,conditions,startDate,onStartDate,onNextPlan,nextPlanBusy=false,onSwap,onChoose,progress,dailyCalories,dashboard,perMealCalories}:{onAllMeals?:()=>void;focusMeal?:number|null;nutritionReference?:DailyNutritionReference;shoppingTotal:number;intake:ReturnType<typeof useFoodIntake>;userId?:string;onLogin:()=>void;ids:string[];products:PlanProduct[];conditions:PlanConditions;startDate:string;onStartDate:(date:string)=>void;onNextPlan?:()=>void;nextPlanBusy?:boolean;onSwap:(index:number,reason?:SwapReason)=>void;onChoose:(index:number,id:string)=>void;progress:ReturnType<typeof useShoppingProgress>;dailyCalories:number|null;perMealCalories?:number|null;dashboard?:DashboardData|null;overviewOpen?:boolean;onOverviewOpen?:(open:boolean)=>void}){
 const locale=usePlannerLocale();
 const mealNavId=useId();
 const [recordExpanded,setRecordExpanded]=useState(focusMeal!==null);
 const [detailPhotos,setDetailPhotos]=useState<Set<number>>(()=>new Set());
 const [chosenSlot,setChosenSlot]=useState<MealSlot|null>(null);
 const won=locale.money;
 const {today,current,totals}=intake;
 const schedule=mealSchedule(conditions);
 const days=conditions.days??Math.max(1,...schedule.map(s=>s.day));
 const active=planDay(startDate,today,days);
 const [chosenDay,setChosenDay]=useState<number|null>(null);
 // 알림에서 들어온 끼니는 기록 패널을 연 채로 시작한다(알림 → 먹었어요, 두 번이면 끝).
 useEffect(()=>{if(focusMeal===null)return;const card=document.getElementById('meal-record-entry');card?.scrollIntoView({block:'center'});card?.focus({preventScroll:true});},[focusMeal]);
 // Each card shows its sections (재료·영상·메뉴 바꾸기·영양) as titled rows that open independently.
 const [openSections,setOpenSections]=useState<Set<string>>(()=>new Set());
 const isSection=(index:number,key:string)=>openSections.has(`${index}:${key}`);
 const toggleSection=(index:number,key:string)=>setOpenSections(prev=>{const next=new Set(prev),k=`${index}:${key}`;if(next.has(k))next.delete(k);else next.add(k);return next;});
 const {stats,newBadges,dismissBadges}=useIntakeStats(userId);
 const [browsing,setBrowsing]=useState<number|null>(null);
 const day=chosenDay!==null&&chosenDay<=days?chosenDay:focusMeal!==null&&schedule[focusMeal]?schedule[focusMeal].day:active.day;
 const date=planDate(startDate,day),isToday=date===today;
 const entries=ids.flatMap((id,index)=>{const product=products.find(p=>p.id===id);return product&&schedule[index]?.day===day?[{product,index,slot:schedule[index].slot}]:[];});
 const selectedSlot=chosenSlot??(focusMeal!==null?schedule[focusMeal]?.slot:undefined)??entries[0]?.slot??'breakfast';
 const weeklySpent=dashboard?.expenses.filter(e=>e.category==='food'&&e.date>=dashboard.week&&e.date<addDays(dashboard.week,7)).reduce((sum,e)=>sum+e.amount,0);
 const mealCost=current?.logs.reduce((sum,log)=>sum+(log.cost??0),0)??0;
 const missingCost=current?.logs.some(log=>log.cost==null);
 const disabled=intake.disabled||progress.busy||!progress.ready;
 const todayDay=planDate(startDate,active.day)===today?active.day:null;
 const todayIds=todayDay===null?[]:ids.flatMap((id,index)=>schedule[index]?.day===todayDay?[{id,index}]:[]);
 const eatenToday=new Set(todayIds.flatMap(({id,index},entryIndex)=>{const portions=current?.logs.filter(l=>l.productId===id).reduce((sum,l)=>sum+l.portions,0)??0;return recordedForSlot(todayIds.map(e=>e.id),entryIndex,portions)>=1?[index]:[];}));
 return locale.render(<section className="today-meals" aria-label="오늘의 식사와 식비">


  {intake.loading&&<p role="status">오늘 기록을 불러오는 중…</p>}
  {intake.error&&<p role="alert">{intake.error} <button type="button" disabled={intake.busy} onClick={()=>intake.pending?void intake.send(intake.pending):intake.reload()}>다시 확인</button></p>}
  {intake.message&&<p role="status">{intake.message}</p>}
  {ids.length>0?<>
   <div className="today-title"><h3 tabIndex={-1} data-recommended-menu-heading>{isToday?'오늘 이렇게 먹어요':`${day}일차 이렇게 먹어요`}</h3>{userId&&<StreakChip stats={stats}/>}<span>{date.slice(5).replace('-','/')}</span></div>

   {!active.active&&<div className="today-next-plan"><p>{today<startDate?'아직 시작 전인 식단이에요. 시작일을 바꿀 수 있어요.':'이 식단의 일정이 끝났어요. 오늘부터 먹을 메뉴를 준비해 볼까요?'}</p>{today>=startDate&&onNextPlan&&<><button type="button" className="primary-button" disabled={nextPlanBusy} onClick={onNextPlan}>{nextPlanBusy?'다음 식단 준비 중…':'같은 조건으로 다음 식단 만들기'}</button><small>인원·끼니·취향은 유지하고 오늘부터 새로 추천해요. 확인 후 식단을 저장해 주세요.</small></>}</div>}
   <nav className="today-days" aria-label="준비한 식단 날짜">{Array.from({length:days},(_,i)=>i+1).map(n=><button type="button" key={n} aria-pressed={n===day} onClick={()=>{setChosenDay(n);setBrowsing(null);}}><strong>{planDate(startDate,n)===today?'오늘':planDate(startDate,n)===addDays(today,1)?'내일':`${n}일차`}</strong><small>{planDate(startDate,n).slice(5).replace('-','/')}</small></button>)}</nav>
   <p className="meal-switch-hint">끼니를 눌러 메뉴를 확인하세요 · 영양·기록은 내 1인분 기준</p>
   <nav className="meal-switch" aria-label="끼니 선택">{(['breakfast','lunch','dinner'] as const).map(slot=>{const entry=entries.find(e=>e.slot===slot);return <button type="button" key={slot} aria-pressed={selectedSlot===slot} aria-controls={`${mealNavId}-panel`} onClick={()=>{setChosenSlot(slot);setBrowsing(null);}}><strong>{slotLabels[slot]}</strong><small>{entry?(eatenToday.has(entry.index)&&isToday?'기록 완료':entry.product.name.replace(/_/g,' · ')):'추천 식단 없음'}</small></button>;})}</nav>
   <div id={`${mealNavId}-panel`} role="region" aria-label={`${slotLabels[selectedSlot]} 식사`}>
   {!entries.some(e=>e.slot===selectedSlot)&&<div className="meal-slot-empty"><strong>{slotLabels[selectedSlot]}은 추천 식단에 없어요</strong><p>추천받을 때 선택한 끼니만 포함돼요. 먹은 음식은 따로 기록할 수 있어요.</p>{onAllMeals&&<button type="button" className="primary-button" disabled={nextPlanBusy} onClick={onAllMeals}>아침·점심·저녁 모두 추천받기</button>}<Link href="/record">먹은 음식 기록하기</Link></div>}
   <div className="today-menu-list">{entries.map(({product:p,index,slot},entryIndex)=>{
    const owned=intake.products.find(i=>i.id===p.id);
    const parts=purchaseBasket([p.id],products,[],{});
    const orderedParts=parts.map(r=>progress.stock[r.product.id]).filter(s=>s&&s.ordered>0);
    const portions=isToday?(current?.logs.filter(l=>l.productId===p.id).reduce((sum,l)=>sum+l.portions,0)??0):0;
    const recorded=recordedForSlot(entries.map(e=>e.product.id),entryIndex,portions);
    // Any logged portion counts: the 먹었어요 panel records the actual amount (반·1.5인분 …) in one entry.
    const done=recorded>0,canEat=owned&&owned.available>=0.25;
    const kcal=servingNutrition(p).calories,kcalParts=mealCalorieParts(p);
    return <article hidden={slot!==selectedSlot} key={index} id={`today-meal-${index}`} tabIndex={-1} className={done?'today-menu done':'today-menu'}>
     <div className="today-menu-label"><span className="meal-slot">{slot==='breakfast'?'☀️':slot==='lunch'?'🌤️':'🌙'} {slotLabels[slot]}</span><b className={`meal-status${done?' is-done':''}`}>{done?'먹었어요 ✓':availablePortions(progress.stock,p)>=1?'집에 있어요':orderedParts.length?'배송 기다리는 중':'구매 전'}</b></div>
     <div className="today-product"><div className="today-menu-toggle-text"><span className="today-menu-name">{p.name.split('_').join(' · ')}</span><span className="today-menu-price">{p.recipe?'재료비':'한 끼'} 약 <b>{won(p.price/p.servings)}</b></span></div></div>
     {slot===selectedSlot&&!!p.recipe?.sides?.length&&<MealCompositionPhotos key={p.id} product={p}/>}
     {!!p.recipe?.sides?.length&&<div className="meal-composition-summary"><MealTableIllustration sides={p.recipe.sides.length}/><div><strong>오늘의 한 상</strong><p>밥 한 공기 · {p.name.split(' + ')[0].replace(/_/g,' · ')} · {p.recipe.sides.map(s=>s.name.replace(/_/g,' · ')).join(' · ')}</p><small>밥·메인·반찬을 합친 1인분 재료비와 영양이에요.</small></div></div>}
     {kcal!==null&&<div className="meal-kcal"><div className="meal-kcal-total"><b>{Math.round(kcal).toLocaleString('ko-KR')}</b><span>kcal</span><small>한 끼</small></div>{kcalParts.rice&&<p className="meal-kcal-line"><span>{p.name.split(' + ')[0].split('_')[0]} 1인분{kcalParts.dish.grams!==null?` (약 ${kcalParts.dish.grams}g)`:''}</span> <b>{Math.round(kcalParts.dish.kcal??0)}</b> + <span>밥 한 공기</span> <b>{Math.round(kcalParts.rice.kcal)}</b>{kcalParts.sides&&<> + <span>반찬 {kcalParts.sides.names.length}개</span> <b>{Math.round(kcalParts.sides.kcal)}</b></>}</p>}</div>}
     {p.recipe&&<p className="meal-ingredient-count">🧺 등록 재료 {p.recipe.ingredients.length}가지 <small>양념 포함 · 메인 메뉴 기준</small></p>}
     <p className="meal-price-basis">1인분 사용량 기준 · {p.recipe?'재료비 추정이며, 집에 있는 재료를 뺀 추가 구매액은 아니에요.':'실제 구매 단위·배송비에 따라 결제 금액은 달라요.'}</p>
     <MealActionFlow key={`${index}-${p.id}`} disabled={disabled} onBrowse={()=>setBrowsing(index)} onRecord={()=>{setRecordExpanded(true);requestAnimationFrame(()=>{const entry=document.getElementById('meal-record-entry');entry?.scrollIntoView({behavior:'smooth',block:'start'});entry?.focus({preventScroll:true});});}} recipe={p.recipe?<>{!p.recipe.assembly&&<details className="meal-video-entry"><summary><span className="meal-video-play" aria-hidden="true">▶</span><span><strong>영상으로 만드는 법 보기</strong><small>YouTube 참고 영상</small></span><span className="meal-video-chevron" aria-hidden="true">⌄</span></summary><RecipeVideos dishId={p.id}/></details>}<RecipeProductPreview product={p} videos={false}/><p className="meal-action-recipe-note">재료와 조리 순서를 먼저 확인하세요. 참고 영상은 재료·분량이 다를 수 있어요.</p></>:<p>직접 조리하는 레시피가 없는 메뉴예요. 상품의 조리 안내를 확인하세요.</p>} outside={!locale.isTaiwan?<NearbyRestaurants key={p.id} menu={p.name.replace(/_/g,' ')} embedded/>:<p>현재 지역에서는 식당 찾기를 준비 중이에요.</p>} alternatives={<MealAlternatives key={p.id} index={index} ids={ids} products={products} conditions={conditions} limit={3} disabled={disabled||done} onChoose={onChoose}/>}/>


     <details onToggle={e=>{const open=e.currentTarget.open;setDetailPhotos(previous=>{const next=new Set(previous);if(open)next.add(index);else next.delete(index);return next;});if(open)trackAnalytics('menu_details_opened');}} className="meal-more"><summary><span className="meal-more-icon" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15M6 8h3M6 12h3M15 8h3M15 12h3"/></svg></span><span className="meal-more-copy"><strong>{'사진 · 곁들임 · 영양정보'}</strong></span><span className="meal-more-action"><span className="meal-more-open-label">펼치기</span><span className="meal-more-close-label">접기</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></span></summary><div className="meal-sections">

      {detailPhotos.has(index)&&!p.recipe?.sides?.length&&<MealPhotoGallery key={p.id} product={p}/>}
      {!locale.isTaiwan&&p.recipe&&<MealSection title={sideFit(p)==='none'?'곁들임 추천':sideFit(p)==='kimchi'?'곁들일 김치 추천':'이 메뉴와 잘 맞는 반찬'} meta={sideFit(p)==='none'?'음료·수프·샐러드·소스':sideFit(p)==='kimchi'?'한 그릇 요리에 곁들이기 좋은 김치':'이 메뉴에 어울리는 반찬'} open={isSection(index,'sides')} onToggle={()=>toggleSection(index,'sides')}><SideDishSuggest main={p} conditions={conditions}/></MealSection>}
      <MealSection title="왜 이 조합을 추천했나요?" meta={kcal!==null?`한 끼 약 ${Math.round(kcal)}kcal`:undefined} open={isSection(index,'nutri')} onToggle={()=>toggleSection(index,'nutri')}>
     {!locale.isTaiwan&&<p className="recommendation-reasons">{recommendationReasons(p,conditions,perMealCalories??null).join(' · ')}</p>}
       <ProductNutrition product={p}/>
      </MealSection>
     </div>
     </details>
     {userId&&canEat&&!done&&<small className="today-left">집에 남은 음식 {amount(owned.available)}회분</small>}
     {!isToday&&<small>이날의 추천 메뉴예요. 오늘 먹은 음식은 아래 기록하기에서 남길 수 있어요.</small>}{recorded>0&&!done&&<small>오늘 {recorded}회분 기록했어요. 나머지를 드셨다면 먹었어요를 눌러 주세요.</small>}
    </article>;
   })}</div></div>
   <MealRecordAccordion intake={intake} userId={userId} onLogin={onLogin} initialOpen={focusMeal!==null} expanded={recordExpanded} onExpandedChange={setRecordExpanded}/>
   <DailyRecommendationNutrition products={entries.map(e=>e.product)} reference={nutritionReference??null}/>
   <MealPlanOverview ids={ids} products={products} conditions={conditions} startDate={startDate} shoppingTotal={shoppingTotal} onSwap={onSwap} locked={eatenToday} disabled={disabled} open={overviewOpen} onOpenChange={onOverviewOpen} onMeal={(n,index)=>{setChosenDay(n);setChosenSlot(schedule[index]?.slot??null);setBrowsing(null);requestAnimationFrame(()=>requestAnimationFrame(()=>{const card=document.getElementById(`today-meal-${index}`);card?.scrollIntoView({behavior:'smooth',block:'start'});card?.focus({preventScroll:true});}));}}/>
   <details className="today-date-settings"><summary>식단 시작일 변경</summary><label className="today-start">식단 시작일<input type="date" value={startDate} onChange={e=>{if(e.target.value){onStartDate(e.target.value);setChosenDay(null);setChosenSlot(null);setBrowsing(null);}}}/></label></details>
   <BadgeToast badges={newBadges} onClose={dismissBadges}/>
   <MenuPickerModal index={browsing} ids={ids} products={products} conditions={conditions} onChoose={onChoose} onClose={()=>setBrowsing(null)} disabled={disabled}/>
   <p className="today-note">한 끼 비용은 간편식의 회분 가격 또는 직접 요리에 쓰는 재료비예요. 실제 결제·배송비와 다를 수 있어요.</p>
  </>:<div className="today-empty">아래에서 예산과 챙길 끼니를 고르면, 오늘 먹을 메뉴부터 준비해 드려요.</div>}
  {userId?<details className="today-record-summary"><summary>오늘의 영양·식비 기록 보기</summary>
   <div className="today-metrics">
    <article><span>오늘 섭취 칼로리</span><strong>{totals?amount(totals.calories):'—'} <small>kcal</small></strong>{dailyCalories?<small>하루 참고량 {amount(dailyCalories)} kcal</small>:!locale.isTaiwan&&<Link href="/profile#profile-settings">내 필요 열량 설정 →</Link>}{!!totals?.missingCalories&&<small>미확인 {totals.missingCalories}건 별도</small>}</article>
    <article><span>오늘 섭취 단백질</span><strong>{totals?amount(totals.protein):'—'} <small>g</small></strong><small>상품 표시 · 요리는 재료 합산 예상</small>{!!totals?.missingProtein&&<small>미확인 {totals.missingProtein}건 별도</small>}</article>
    <article><span>오늘 먹은 음식 비용</span><strong>{current?won(mealCost):'—'}</strong><small>기록 시 등록 가격 기준 · 예상{missingCost?' · 금액 미확인 기록 별도':''}</small></article>
    {!locale.isTaiwan&&<article><span>이번 주 기록한 식비</span><strong>{weeklySpent===undefined?'—':won(weeklySpent)}</strong>{dashboard?.budget?<small>주간 예산 {won(dashboard.budget)} · {weeklySpent!>dashboard.budget?`${won(weeklySpent!-dashboard.budget)} 초과`:`${won(dashboard.budget-weeklySpent!)} 남음`}</small>:<Link href="/record">식비·예산 기록하기 →</Link>}<small>구매 시 기록한 금액 + 직접 입력한 지출</small></article>}
   </div>
   {current&&!current.logs.length&&<p className="today-note">실제로 먹은 한 끼를 남겨보세요. 사진이나 음식 검색으로 기록하면 여기에 쌓여요.</p>}
   <Link href="/record">먹은 기록·식비 자세히 보기 →</Link>
  </details>:<p className="today-note">비회원도 추천 식단을 이어서 볼 수 있어요. <button type="button" onClick={onLogin}>로그인하고 영양 기록 남기기 →</button></p>}
 </section>);
}
