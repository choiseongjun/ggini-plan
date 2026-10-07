'use client';
import type {PlanProduct} from '../lib/shopping-plan';
import {pantryShortage} from '../lib/pantry-recommendation';
import {RecipeProductPreview} from './meal-source';
import './pantry-daily-results.css';

export function PantryDailyResults({ids,products,candidateIds,owned,disabled,onChoose,onSave}:{ids:string[];products:PlanProduct[];candidateIds:string[];owned:string[];disabled:boolean;onChoose:(index:number,id:string)=>void;onSave:()=>void}){
 const slots=['아침','점심','저녁'];
 const candidates=candidateIds.flatMap(id=>{const p=products.find(p=>p.id===id);return p?[p]:[];});
 return <section className="pantry-daily-results"><h2>아침부터 저녁까지, 이렇게 먹어요</h2><p>마음에 안 드는 메뉴는 아래 목록에서 골라 바꿔주세요.</p><div className="pantry-daily-slots">{ids.map((id,i)=>{const p=products.find(p=>p.id===id);return <article key={i}><small>{slots[i]}</small><strong>{p?.name??'메뉴 확인 중'}</strong>{p&&<details><summary>재료·만드는 법</summary><RecipeProductPreview product={p}/></details>}</article>;})}</div><button className="pantry-primary" disabled={disabled} onClick={onSave}>이 식단 저장하기</button><h3>다른 메뉴로 바꿔볼까요?</h3><p>추가로 필요한 주재료가 적은 메뉴부터 보여드려요. 양념은 상세에서 확인하세요.</p><div className="pantry-daily-list">{candidates.map(p=><article key={p.id}>{p.productImageUrl&&<img src={p.productImageUrl} alt="" loading="lazy"/>}<div><h4>{p.name}</h4><small>더 필요한 주재료: {pantryShortage(p,owned).main.join(' · ')||'없음'}</small><div className="pantry-daily-pick">{slots.map((slot,i)=><button key={slot} disabled={disabled||ids[i]===p.id} onClick={()=>onChoose(i,p.id)}>{ids[i]===p.id?`${slot} 선택됨`:`${slot}에 담기`}</button>)}</div><details><summary>상세보기</summary><RecipeProductPreview product={p}/></details></div></article>)}</div></section>;
}
