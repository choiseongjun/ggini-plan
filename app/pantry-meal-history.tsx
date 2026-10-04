'use client';
import Link from 'next/link';
import {usePantryJourney} from './use-pantry-journey';
import {mealDate} from '../lib/pantry-journey';
import {pantrySourceProducts} from '../lib/pantry-source-recommendations';
import './pantry-home.css';

export function PantryMealHistory({userId}:{userId?:string}){
 const {journey,ready,error,favorite,removeGuest}=usePantryJourney(userId);
 const favorites=pantrySourceProducts().filter(p=>journey.favorites.includes(p.id));
 const meals=journey.meals.filter(m=>m.status==='saved').sort((a,b)=>b.eatenAt.localeCompare(a.eatenAt));
 return <section className="pantry-home pantry-journal" aria-label="내가 먹은 추천 메뉴">
  {!userId&&<><h2>내가 먹은 한 끼</h2><p className="pantry-muted">이 기기에 저장된 기록이에요. 로그인 후 기록한 식사는 계정에 저장돼요.</p>
  {!ready?<p role="status">기록을 불러오는 중…</p>:!meals.length?<p>아직 기록이 없어요. 메뉴를 골라 ‘먹었어요’를 눌러보세요. <Link href="/">메뉴 찾기 →</Link></p>:<div className="pantry-history-list">{meals.map(m=><article key={m.id}><small>{mealDate(m.eatenAt)}</small><Link href={`/recipes/${m.recipeId}`}>{m.name}</Link><div><button aria-pressed={journey.favorites.includes(m.recipeId)} onClick={()=>favorite(m.recipeId)}>또 먹고 싶어요</button><button onClick={()=>removeGuest(m.id)} aria-label={`${m.name} 식사 기록 취소`}>기록 취소</button></div></article>)}</div>}</>}
  <h2>또 먹고 싶은 메뉴</h2><p className="pantry-muted">취향은 이 기기에 저장되고 다음 추천에 반영돼요.</p>
  {favorites.length?<div className="pantry-history-list">{favorites.map(p=><article key={p.id}><Link href={`/recipes/${p.id}`}>{p.name}</Link><button onClick={()=>favorite(p.id)} aria-label={`${p.name} 좋아요 취소`}>저장 해제</button></article>)}</div>:<p>좋아한 메뉴를 저장하면 여기서 바로 다시 만들 수 있어요.</p>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
