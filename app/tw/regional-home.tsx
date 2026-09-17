'use client';
import {useEffect,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {LanguageSwitcher} from '../language-switcher';
import {usePathname,useRouter} from 'next/navigation';
import {AppShell,Brand,Icon,type IconName} from '../app-shell';
import {PlannerLocale} from '../planner-locale';
import {ShoppingPlanner} from '../shopping-planner';
import {FoodIntake} from '../food-intake';

export default function RegionalHome({introduction}:{introduction?:ReactNode}){
 const pathname=usePathname(),router=useRouter(),tab=pathname.split('/')[2]??'home';
 const [confirm,setConfirm]=useState(false);
 useEffect(()=>{const before=document.documentElement.lang;document.documentElement.lang='zh-TW';return()=>{document.documentElement.lang=before;};},[]);
 return <PlannerLocale value="TW"><AppShell>
  <header className="app-header"><Brand/><div className="app-header-actions"><LanguageSwitcher market="TW"/></div></header>
  <div className="app-content">
   {tab==='home'&&introduction}
   {(tab==='home'||tab==='cart')&&<ShoppingPlanner key={tab} userId="tw-local" mode={tab==='cart'?'cart':'plan'} onLogin={()=>{}}/>}
   {tab==='record'&&<FoodIntake userId="tw-local" history onLogin={()=>{}}/>}
   {tab==='profile'&&<section className="home-guide-entry"><h2>我的設定</h2><p>台灣 · 繁體中文 · 新臺幣</p><p>購物與用餐紀錄儲存在這個瀏覽器。韓國與台灣的資料分開保存。</p><button type="button" onClick={()=>setConfirm(true)}>清除台灣紀錄</button>{confirm&&<div role="group" aria-label="確認清除"><p>清除這個瀏覽器的台灣餐點、庫存與用餐紀錄？</p><button type="button" onClick={()=>{for(const key of ['kkiniplan-shopping-draft-v2-guest-TW','kkiniplan-progress-products-guest-TW','kkiniplan:TW:zh-TW:v1']){localStorage.removeItem(key);sessionStorage.removeItem(key);}setConfirm(false);router.replace('/tw');}}>確認清除</button><button type="button" onClick={()=>setConfirm(false)}>取消</button></div>}</section>}
   <section className="home-guide-entry"><strong>食材與食品價格目錄</strong><p>查看實際商品、販售規格與營養來源。</p><Link href="/tw/products">瀏覽全部商品 →</Link><Link href="/tw/categories/ingredients">生鮮食材 →</Link><Link href="/tw/categories/frozen">冷凍食品 →</Link></section>
   <section className="home-guide-entry contact-entry"><strong>💌 意見與合作邀約</strong><p>遇到問題或有想法，歡迎告訴我們。</p><a href="mailto:choisj2702@gmail.com?subject=GginiPlan%20台灣">寄信給我們 ↗</a><small>此瀏覽器的紀錄不會同步到其他裝置。</small></section>
  </div>
  <nav className="bottom-nav" aria-label="主要選單">{([['home','首頁','home'],['cart','購物清單','bag'],['record','紀錄','chart'],['profile','我的','user']] as [string,string,IconName][]).map(([key,label,icon])=><Link key={key} className={tab===key?'active':''} aria-current={tab===key?'page':undefined} href={key==='home'?'/tw':`/tw/${key}`}><Icon name={icon} size={21}/><span>{label}</span></Link>)}</nav>
 </AppShell></PlannerLocale>;
}
