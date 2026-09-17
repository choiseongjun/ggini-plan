'use client';
import {usePlannerLocale} from './planner-locale';
import {MealComparison} from './meal-comparison';
import {useState} from 'react';
import Link from 'next/link';
import type {useFoodIntake} from './food-intake';
import {ProductThumb} from './product-thumb';
import {MealSourceBadge,RecipeProductPreview} from './meal-source';
import {availablePortions,servingNutrition} from '../lib/food-intake';
import {purchaseBasket,slotLabels,type PlanProduct,type PlanConditions,mealSchedule} from '../lib/shopping-plan';
import {planDay,planDate,recordedForSlot} from '../lib/daily-plan';
import {addDays,type DashboardData} from '../lib/dashboard';
import {ShoppingProgress,type useShoppingProgress} from './shopping-progress';
import './today-meals.css';

const amount=(n:number)=>n.toLocaleString('ko-KR',{maximumFractionDigits:1});
export function TodayMeals({intake,userId,onLogin,ids,products,conditions,startDate,onStartDate,onSwap,onChoose,progress,dailyCalories,dashboard}:{intake:ReturnType<typeof useFoodIntake>;userId?:string;onLogin:()=>void;ids:string[];products:PlanProduct[];conditions:PlanConditions;startDate:string;onStartDate:(date:string)=>void;onSwap:(index:number)=>void;onChoose:(index:number,id:string)=>void;progress:ReturnType<typeof useShoppingProgress>;dailyCalories:number|null;dashboard?:DashboardData|null}){
 const locale=usePlannerLocale();
 const won=locale.money;
 const {today,current,totals}=intake;
 const schedule=mealSchedule(conditions);
 const days=conditions.days??Math.max(1,...schedule.map(s=>s.day));
 const active=planDay(startDate,today,days);
 const [chosenDay,setChosenDay]=useState<number|null>(null);
 const [partial,setPartial]=useState<number|null>(null);
 const [managing,setManaging]=useState<number|null>(null),[purchaseMessage,setPurchaseMessage]=useState('');
 const day=chosenDay!==null&&chosenDay<=days?chosenDay:active.day;
 const date=planDate(startDate,day),isToday=date===today;
 const entries=ids.flatMap((id,index)=>{const product=products.find(p=>p.id===id);return product&&schedule[index]?.day===day?[{product,index,slot:schedule[index].slot}]:[];});
 const weeklySpent=dashboard?.expenses.filter(e=>e.category==='food'&&e.date>=dashboard.week&&e.date<addDays(dashboard.week,7)).reduce((sum,e)=>sum+e.amount,0);
 const mealCost=current?.logs.reduce((sum,log)=>sum+(log.cost??0),0)??0;
 const missingCost=current?.logs.some(log=>log.cost==null);
 const disabled=intake.disabled||progress.busy||!progress.ready;
 return locale.render(<section className="today-meals" aria-label="오늘의 식사와 식비">
  <header><span className="section-kicker">내 예산으로, 오늘도 한 끼 🍚</span><h2>{userId?'오늘도 가볍게 챙겨요':'골라둔 메뉴, 매일 꺼내 먹어요'}</h2><p>추천받은 식단을 이어 보고, 먹었어요 한 번으로 기록해요.</p></header>
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
   <div className="today-title"><h3 tabIndex={-1} data-recommended-menu-heading>{isToday?'오늘 이렇게 먹어요':`${day}일차 이렇게 먹어요`}</h3><span>{date.slice(5).replace('-','/')}</span></div>
   <label className="today-start">식단 시작일<input type="date" value={startDate} onChange={e=>{if(e.target.value){onStartDate(e.target.value);setChosenDay(null);setManaging(null);}}}/></label>
   {!active.active&&<p className="today-note">{today<startDate?'아직 시작 전인 식단이에요.':'이 식단의 일정이 끝났어요.'} 시작일을 바꾸거나 새로 추천받을 수 있어요.</p>}
   <nav className="today-days" aria-label="준비한 식단 날짜">{Array.from({length:days},(_,i)=>i+1).map(n=><button type="button" key={n} aria-pressed={n===day} onClick={()=>{setChosenDay(n);setManaging(null);}}><strong>{planDate(startDate,n)===today?'오늘':planDate(startDate,n)===addDays(today,1)?'내일':`${n}일차`}</strong><small>{planDate(startDate,n).slice(5).replace('-','/')}</small></button>)}</nav>
   <div className="today-menu-list">{entries.map(({product:p,index,slot},entryIndex)=>{
    const owned=intake.products.find(i=>i.id===p.id);
    const parts=purchaseBasket([p.id],products,[],{});
    const orderedParts=parts.map(r=>progress.stock[r.product.id]).filter(s=>s&&s.ordered>0);
    const nutrition=servingNutrition(p),portions=isToday?(current?.logs.filter(l=>l.productId===p.id).reduce((sum,l)=>sum+l.portions,0)??0):0;
    const recorded=recordedForSlot(entries.map(e=>e.product.id),entryIndex,portions);
    const done=recorded>=1,canEat=owned&&owned.available>=0.25;
    return <article key={index} className={done?'today-menu done':'today-menu'}>
     <div className="today-menu-label"><span>{slot==='breakfast'?'☀️':slot==='lunch'?'🌤️':'🌙'} {slotLabels[slot]} · 1회분</span><b>{done?'먹었어요 ✓':availablePortions(progress.stock,p)>=1?'집에 있어요':orderedParts.length?'배송 기다리는 중':'구매 전'}</b></div>
     <div className="today-product">{!p.recipe&&<ProductThumb item={p}/>}<div><MealSourceBadge product={p}/><h4>{p.name}</h4><strong>한 끼 {p.recipe?'재료비 ':''}약 {won(p.price/p.servings)}</strong><p>{nutrition.calories===null?'칼로리 미확인':`${amount(nutrition.calories)} kcal`} · 단백질 {nutrition.protein===null?'미확인':`${amount(nutrition.protein)} g`}</p>{p.recipe&&<small>재료 영양 합산 예상 · 약 {p.recipe.minutes}분</small>}</div></div>
     <RecipeProductPreview product={p}/>
     {!p.recipe&&<div className="today-product-links">
      {p.productUrl&&<a href={p.productUrl} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} 판매 상품 보기 (새 창)`}>🛍️ 판매 상품 보기 ↗</a>}
      <a href={locale.search(p.name)} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} 네이버쇼핑에서 가격 검색 (새 창)`}>다른 판매처 가격 검색 ↗</a>
     </div>}
     <div className="today-actions">{done?<Link href="/record">기록 확인·취소 →</Link>:!userId?<button type="button" onClick={onLogin}>로그인하고 먹었어요 기록</button>:canEat?<button className="primary-button" type="button" disabled={disabled||!isToday} onClick={()=>{if(owned.available>=1-recorded)intake.eat(owned,1-recorded);else setPartial(index);}}>{owned.available>=1-recorded?'먹었어요':'먹은 양 선택'}</button>:orderedParts.length>0?<button className="primary-button" type="button" disabled={disabled} onClick={()=>void progress.update(orderedParts.map(item=>({item,quantity:item.ordered})),'receive')}>받았어요 ({orderedParts.reduce((n,s)=>n+s.ordered,0)}묶음)</button>:<button type="button" disabled={disabled} aria-expanded={managing===index} onClick={()=>{setManaging(managing===index?null:index);setPurchaseMessage('');}}>구매·보유 상태 등록</button>}<button type="button" disabled={disabled||done} onClick={()=>{setManaging(null);onSwap(index);}}>다른 메뉴로 ↻</button></div>
     {userId&&canEat&&!done&&<><small className="today-left">남은 음식 {amount(owned.available)}회분 · 기본 기록 {amount(1-recorded)}회분</small><button type="button" className="text-link" disabled={disabled||!isToday} onClick={()=>setPartial(partial===index?null:index)} aria-expanded={partial===index}>조금만 먹었어요 · 양 선택</button>{partial===index&&<div className="today-partial"><strong>실제로 먹은 만큼만 기록해요</strong><div>{[0.25,0.5,0.75,1].filter(n=>n<=1-recorded&&n<=owned.available).map(n=><button type="button" key={n} disabled={disabled||!isToday} onClick={()=>{intake.eat(owned,n);setPartial(null);}}>{n===0.5?'절반':n===1?'1회분':n+'회분'} 먹었어요</button>)}</div></div>}</>}
     {managing===index&&<div className="today-purchase-panel">
      <div className="today-purchase-heading"><strong>{p.recipe?'이 끼니의 재료를 등록해요':'이 음식만 등록해요'}</strong><button type="button" disabled={progress.busy} onClick={()=>setManaging(null)}>닫기</button></div>
      <ShoppingProgress key={p.id} single={!p.recipe} restrictToItems guest={locale.isTaiwan||!userId} progress={{...progress,update:async(changes,action,expense)=>{const ok=await progress.update(changes,action,expense);if(ok){setManaging(null);setPurchaseMessage(expense?'구매 상태와 식비를 함께 기록했어요.':'이 음식의 구매·보유 상태를 반영했어요.');}return ok;}}} items={parts.map(r=>({id:r.product.id,name:r.product.name,unit:'묶음',required:r.required*(1-recorded),packSize:1,url:r.product.productUrl,price:r.product.price,detail:r.product.detail}))} summary={<p className="today-note">지금 고른 음식의 수량만 반영해요. 실제 구매한 묶음 수로 조절해 주세요.</p>}/>
     </div>}
     {!locale.isTaiwan&&<MealComparison key={p.id.split('--with--')[0]} product={p} index={index} ids={ids} products={products} conditions={conditions} onChoose={onChoose} disabled={disabled||done}/>}
     {!isToday&&<small>먹은 기록은 오늘 날짜의 메뉴에서 남겨 주세요.</small>}{recorded>0&&!done&&<small>오늘 {recorded}회분 기록했어요. 나머지를 드셨다면 먹었어요를 눌러 주세요.</small>}
    </article>;
   })}</div>
   <p className="today-note">한 끼 비용은 간편식의 회분 가격 또는 직접 요리에 쓰는 재료비예요. 실제 결제·배송비와 다를 수 있어요.</p>
  </>:<div className="today-empty">아래에서 예산과 챙길 끼니를 고르면, 오늘 먹을 메뉴부터 준비해 드려요.</div>}
 </section>);
}
