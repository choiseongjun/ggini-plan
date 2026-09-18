import type {Metadata} from 'next';
import {siteUrl,socialImage} from '../../lib/seo';
import RegionalHome from './regional-home';
import './taiwan.css';

const title='一人餐點推薦・一週餐費預算規劃 | GginiPlan 台灣';
const description='一個人吃飯也能先規劃餐費。依新台幣預算、天數與用餐時段推薦台灣販售的餐點，整理一週菜單、購物清單與營養標示，讓租屋族和上班族更方便準備每一餐。';
export const metadata:Metadata={title,description,twitter:{card:"summary_large_image",title,description,images:[socialImage("tw")]},alternates:{canonical:siteUrl+'/tw',languages:{'ko-KR':siteUrl,'zh-TW':siteUrl+'/tw','x-default':siteUrl+'/'}},openGraph:{title,description,locale:'zh_TW',url:siteUrl+'/tw',siteName:'GginiPlan',type:'website',images:[socialImage('tw')]}};
export default function TaiwanPage(){return <RegionalHome introduction={<section className="home-guide-entry" lang="zh-TW" aria-labelledby="tw-intro-title"><h1 id="tw-intro-title">一人餐點推薦，從餐費預算開始</h1><p>一個人住，每天都要想吃什麼？依新台幣預算、天數和用餐時段，安排台灣販售的餐點，整理這週要買的商品。</p><details><summary>怎麼規劃一週菜單與購物清單？</summary><h2>租屋族與上班族的一週餐費規劃</h2><p>先選 7 天，再選需要準備的早餐、午餐或晚餐，輸入這次購物預算。系統依目前可用商品和條件安排餐點；不需要準備的時段可以不選。</p><h2>預算內有哪些冷凍食品與即食餐點？</h2><p>查看推薦餐點的份量、參考售價與營養標示，再到原賣場購買。整包購買金額和每餐成本不同，運費及結帳價格請以賣場為準。</p><h2>推薦餐點等於減重食譜嗎？</h2><p>這裡協助安排餐費與購物，不是個人醫療或減重處方。未核對的營養數值不會當成零；有特殊飲食需求時，請先確認商品標示與專業建議。</p></details></section>}/>;}
