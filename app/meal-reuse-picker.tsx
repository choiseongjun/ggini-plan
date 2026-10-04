'use client';
import {useState} from 'react';
import './meal-reuse-picker.css';
export type MealHistoryItem={name:string;day:string;count:number};
export function MealReusePicker({items,disabled,onChoose}:{items:MealHistoryItem[];disabled:boolean;onChoose:(name:string)=>void}){
 const [frequent,setFrequent]=useState(false),[query,setQuery]=useState('');
 if(!items.length)return <section className="meal-reuse"><h4>내 메뉴가 여기에 모여요</h4><p>아래에서 메뉴를 저장하면 다음에는 다시 입력하지 않고 고를 수 있어요. 로그인한 계정의 식단·식사 기록을 사용해요.</p></section>;
 const filtered=items.filter(item=>item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 const shown=(frequent?[...filtered].sort((a,b)=>b.count-a.count||b.day.localeCompare(a.day)):filtered).slice(0,8);
 return <section className="meal-reuse" aria-label="이전 메뉴 다시 담기"><h4>전에 먹던 메뉴, 다시 담기</h4><p>메뉴를 고르고 아래에서 저장해 주세요.</p><div className="meal-reuse-tabs"><button type="button" aria-pressed={!frequent} onClick={()=>setFrequent(false)}>최근 메뉴</button><button type="button" aria-pressed={frequent} onClick={()=>setFrequent(true)}>자주 담은 메뉴</button></div><label className="meal-reuse-search">내 메뉴 찾기<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="메뉴 이름 검색"/></label><div className="meal-reuse-list">{shown.map(item=><button type="button" key={item.name} disabled={disabled} onClick={()=>onChoose(item.name)}><span>{item.name}</span><small>{frequent?`${item.count}회`:`${item.day.slice(5).replace('-','/')}에 담았어요`}</small><span aria-hidden="true">＋</span></button>)}</div>{!shown.length&&<p>찾는 메뉴가 없어요. 아래에서 직접 입력해 주세요.</p>}<small>최근 90일의 식단·식사 기록에서 가져와요. 이름만 복사하며, 먹은 기록은 새로 만들지 않아요.</small></section>;
}
