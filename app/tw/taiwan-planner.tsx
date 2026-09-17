'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {buildTaiwanPlan,restoreTaiwanPlan,taiwanProductsOnly,taiwanStorageKey,twMoney,validTaiwanSettings,type TaiwanMeal,type TaiwanProduct,type TaiwanSettings} from '../../lib/taiwan-plan';

const defaults:TaiwanSettings={days:7,slots:['dinner'],budgetMinor:60000};
export default function TaiwanPlanner(){
 const [products,setProducts]=useState<TaiwanProduct[]>([]),[settings,setSettings]=useState(defaults),[meals,setMeals]=useState<TaiwanMeal[]>([]);
 const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading'),[message,setMessage]=useState(''),[tab,setTab]=useState<'plan'|'cart'|'record'>('plan');
 const [planSettings,setPlanSettings]=useState(defaults);
 const [editing,setEditing]=useState(false),[storageWarning,setStorageWarning]=useState(''),[attempt,setAttempt]=useState(0);
 const heading=useRef<HTMLHeadingElement>(null),form=useRef<HTMLElement>(null);
 useEffect(()=>{const previous=document.documentElement.lang;document.documentElement.lang='zh-TW';return()=>{document.documentElement.lang=previous;};},[]);
 useEffect(()=>{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
  fetch('/api/taiwan/catalog',{signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error();const data=await r.json();const ps=taiwanProductsOnly(data.products);if(!ps.length)throw new Error();setProducts(ps);
   try{const raw=localStorage.getItem(taiwanStorageKey);if(raw){const saved=restoreTaiwanPlan(raw,ps);if(saved){setSettings(saved.settings);setPlanSettings(saved.settings);setMeals(saved.meals);}}}catch{setStorageWarning('瀏覽器無法儲存資料，關閉頁面後進度可能遺失。');}setStatus('ready');
  }).catch(()=>{if(!controller.signal.aborted||!disposed)setStatus('error');}).finally(()=>clearTimeout(timer));
  let disposed=false;return()=>{disposed=true;controller.abort();clearTimeout(timer);};
 },[attempt]);
 function save(next:TaiwanMeal[],nextSettings=planSettings){setMeals(next);setPlanSettings(nextSettings);try{localStorage.setItem(taiwanStorageKey,JSON.stringify({market:'TW',currency:'TWD',settings:nextSettings,meals:next}));}catch{setStorageWarning('瀏覽器無法儲存資料，關閉頁面後進度可能遺失。');}}
 function recommend(){if(!validTaiwanSettings(settings)){setMessage('請選擇用餐時段，並輸入有效的預算。');return;}const next=buildTaiwanPlan(products,settings);if(!next.length){setMessage('目前預算不足以安排全部餐點，請參考下方預算範圍。');return;}save(next,settings);setMessage('');setEditing(false);setTab('plan');requestAnimationFrame(()=>{heading.current?.focus();heading.current?.scrollIntoView({behavior:'smooth',block:'start'});});}
 function swap(meal:TaiwanMeal){const otherCost=meals.filter(m=>m.id!==meal.id).reduce((n,m)=>n+(products.find(p=>p.id===m.productId)?.price??0),0);const options=products.filter(p=>p.id!==meal.productId&&p.slots.includes(meal.slot)&&p.price+otherCost<=planSettings.budgetMinor);if(!options.length){setMessage('預算內暫時沒有其他選擇。');return;}const selected=options.sort((a,b)=>meals.filter(m=>m.productId===a.id).length-meals.filter(m=>m.productId===b.id).length)[0];save(meals.map(m=>m.id===meal.id?{...m,productId:selected.id}:m));setMessage('');}
 const count=settings.days*settings.slots.length,prices=products.map(p=>p.price),low=prices.length?Math.min(...prices)*count:0,high=prices.length?Math.max(...prices)*count:0;
 const total=meals.reduce((n,m)=>n+(products.find(p=>p.id===m.productId)?.price??0),0);
 const shopping=products.map(p=>({p,needed:meals.filter(m=>m.productId===p.id&&!m.prepared).length,all:meals.filter(m=>m.productId===p.id).length})).filter(x=>x.all>0);
 const eaten=meals.filter(m=>m.eaten),spent=eaten.reduce((n,m)=>n+(products.find(p=>p.id===m.productId)?.price??0),0);
 const calories=eaten.reduce((n,m)=>n+(products.find(p=>p.id===m.productId)?.caloriesKcal??0),0),protein=eaten.reduce((n,m)=>n+(products.find(p=>p.id===m.productId)?.proteinG??0),0);
 return <main className="tw-app" lang="zh-TW">
  <header className="tw-header"><Link href="/tw" className="tw-brand">🍚 Kkini Plan</Link><nav aria-label="國家與語言"><span aria-current="page">台灣 · 繁中</span><Link href="/" lang="ko">한국어 ↗</Link></nav></header>
  <section className="tw-hero"><span className="tw-tag">台灣試用版 🌱</span><h1>預算剛剛好，<br/>每一餐都安排好。</h1><p>從台灣販售的餐點開始，少想一點，安心吃飯。</p><Link href="/tw/products">逛逛台灣商品 →</Link><span className="tw-mascot" aria-hidden="true">🍙</span></section>
  {status==='loading'&&<section className="tw-panel" role="status">🍲 正在整理台灣餐點…</section>}
  {status==='error'&&<section className="tw-panel" role="alert"><p>暫時無法載入商品，請稍後再試。</p><button onClick={()=>{setStatus('loading');setAttempt(a=>a+1);}}>重新載入</button></section>}
  {status==='ready'&&<>
   {(!meals.length||editing)&&<section className="tw-panel" ref={form} aria-label="餐點設定"><h2>這次想準備幾天？</h2><div className="tw-days">{Array.from({length:15},(_,i)=><button key={i} aria-pressed={settings.days===i+1} onClick={()=>setSettings(s=>({...s,days:i+1}))}>{i+1}<small>天</small></button>)}</div>
    <h3>想安排哪一餐？</h3><div className="tw-row">{(['lunch','dinner'] as const).map(slot=><button key={slot} aria-pressed={settings.slots.includes(slot)} onClick={()=>setSettings(s=>({...s,slots:s.slots.includes(slot)?s.slots.filter(x=>x!==slot):(['lunch','dinner'] as const).filter(x=>x===slot||s.slots.includes(x))}))}>{slot==='lunch'?'☀️ 午餐':'🌙 晚餐'}</button>)}</div>
    <label className="tw-budget">購物預算（新台幣）<span>NT$ <input inputMode="numeric" type="number" min="1" max="100000" step="1" value={settings.budgetMinor/100||''} onChange={e=>setSettings(s=>({...s,budgetMinor:Math.round(Number(e.target.value)*100)}))}/></span></label>
    <p className="tw-hint">{count} 餐，按目前商品價格約 {twMoney(low)}～{twMoney(high)}，未含運費。</p><button className="tw-primary" onClick={recommend}>幫我安排餐點 ✨</button><p className="tw-small">目前提供 {products.length} 款冷凍主餐。營養為商品標示，不代表個人營養需求；食材與過敏原請查看原包裝。</p>
   </section>}
   {message&&<p role="alert" className="tw-notice">{message}</p>}
   {meals.length>0&&<><nav className="tw-tabs" aria-label="計畫功能">{(['plan','cart','record'] as const).map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t==='plan'?'🍱 餐點':t==='cart'?'🛍️ 購物清單':'🌱 飲食紀錄'}</button>)}</nav>
    <section className="tw-section"><div className="tw-section-title"><h2 tabIndex={-1} ref={heading}>{tab==='plan'?'我的餐點計畫':tab==='cart'?'這次要買的餐點':'吃過的每一餐'}</h2>{tab==='plan'&&<button onClick={()=>{setEditing(true);requestAnimationFrame(()=>form.current?.scrollIntoView({behavior:'smooth'}));}}>重新設定</button>}</div>
     {tab==='plan'&&<><p className="tw-hint">{meals.length} 餐 · 商品合計 {twMoney(total)} · 未含運費</p>{meals.map((m,i)=>{const p=products.find(x=>x.id===m.productId)!;return <article className="tw-meal" key={m.id}><div className="tw-meal-top"><span>第 {Math.floor(i/planSettings.slots.length)+1} 天 · {m.date.slice(5).replace('-','/')} · {m.slot==='lunch'?'午餐':'晚餐'}</span><span className="tw-tag">{m.eaten?'已吃過 ✓':m.prepared?'已備妥':'待準備'}</span></div><div className="tw-product"><img src={p.productImageUrl??''} alt={p.name} loading="lazy" referrerPolicy="no-referrer"/><div><h3>{p.name}</h3><strong>每餐 {twMoney(p.price)}</strong><p>{p.caloriesKcal} kcal · 蛋白質 {p.proteinG}g</p><small>{p.detail} · 1 包為一餐</small></div></div><div className="tw-actions"><a href={p.productUrl!} target="_blank" rel="noopener noreferrer">到桂冠購買 ↗</a>{!m.prepared&&<button onClick={()=>swap(m)}>換一道 ↻</button>}<button onClick={()=>save(meals.map(x=>x.id===m.id?{...x,prepared:!x.prepared,eaten:false}:x))}>{m.prepared?'取消準備':'已備妥 ✓'}</button>{m.prepared&&<button onClick={()=>save(meals.map(x=>x.id===m.id?{...x,eaten:!x.eaten}:x))}>{m.eaten?'撤銷吃過':'吃過了 😋'}</button>}</div><details><summary>價格與營養來源</summary><p>價格確認：{p.priceCheckedAt?.slice(0,10)}。{p.priceNote}</p><a href={p.nutritionPhotoUrl!} target="_blank" rel="noopener noreferrer">查看官方營養標示 ↗</a></details></article>;})}</>}
     {tab==='cart'&&<><p className="tw-hint">尚需購買約 {twMoney(shopping.reduce((n,x)=>n+x.needed*x.p.price,0))} · 未含運費</p><p className="tw-small">相同商品已合併數量。點「已備妥」只代表自行確認，不會自動下單。</p>{shopping.map(({p,needed,all})=><article className="tw-meal" key={p.id}><div className="tw-product"><img src={p.productImageUrl??''} alt={p.name} loading="lazy"/><div><h3>{p.name}</h3><p>計畫共 {all} 包 · 還需要 {needed} 包</p><strong>{twMoney(p.price*needed)}</strong></div></div><div className="tw-actions"><a href={p.productUrl!} target="_blank" rel="noopener noreferrer">到桂冠購買 ↗</a>{needed>0&&<button onClick={()=>{let changed=false;save(meals.map(m=>{if(!changed&&m.productId===p.id&&!m.prepared){changed=true;return {...m,prepared:true};}return m;}));}}>1 包已備妥 ✓</button>}</div></article>)}</>}
     {tab==='record'&&<><div className="tw-stats"><div><strong>{eaten.length}</strong><span>已吃餐數</span></div><div><strong>{Math.round(calories)}</strong><span>kcal</span></div><div><strong>{protein.toFixed(1)}g</strong><span>蛋白質</span></div></div><p>已吃餐點估計成本：<strong>{twMoney(spent)}</strong></p><p className="tw-small">按目前登錄的每包價格估算，不等同實際支出。只計入標記「吃過了」的餐點。</p>{!eaten.length?<p>吃完後到餐點頁按「吃過了」，就會出現在這裡 🌱</p>:eaten.map(m=><article className="tw-record" key={m.id}><span>{m.date} · {m.slot==='lunch'?'午餐':'晚餐'}</span><strong>{products.find(p=>p.id===m.productId)?.name}</strong></article>)}</>}
    </section></>}
  </>}
  {storageWarning&&<p role="alert" className="tw-notice">{storageWarning}</p>}
  <footer className="tw-footer"><p>台灣版的計畫保存在此瀏覽器，與韓國版分開，不會跨裝置同步。</p><p>目前串接桂冠商品資料；售價、庫存與配送範圍以賣場結帳為準。</p><a href="mailto:choisj2702@gmail.com?subject=Kkini%20Plan%20%E5%8F%B0%E7%81%A3%E7%89%88%E6%84%8F%E8%A6%8B">💌 使用意見與合作洽詢</a>{meals.length>0&&<details><summary>清除台灣版計畫</summary><p>將清除這台裝置的台灣餐點與紀錄。</p><button onClick={()=>{save([],defaults);setSettings(defaults);setEditing(false);setMessage('');setTab('plan');}}>確認清除</button></details>}</footer>
 </main>;
}
