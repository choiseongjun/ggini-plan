'use client';

import {RiceBuddy} from './rice-buddy';
import './home-entry.css';

export function HomeEntry({onChoose}:{onChoose:(entry:'pantry'|'recommend')=>void}){
 return <section className="home-entry" aria-labelledby="home-entry-title">
  <div className="home-entry-heading"><span>오늘의 한 끼, 여기서 정해요</span><h2 id="home-entry-title">있는 재료로 만들까요?<br/>새로운 메뉴를 찾을까요?</h2><p>지금 필요한 방법 하나만 골라주세요.</p></div>
  <div className="home-entry-primary"><div className="home-entry-art" aria-hidden="true"><RiceBuddy stage={4}/></div><span className="home-entry-eyebrow">냉장고에 재료가 있다면</span><h3>있는 재료로 한 끼 만들기</h3><p>사진으로 재료를 찾거나 직접 적어주세요.<br/>만들 메뉴와 더 필요한 재료를 알려드려요.</p><button type="button" onClick={()=>onChoose('pantry')}>있는 재료 넣기 <span aria-hidden="true">→</span></button><small>사진 자동 인식은 로그인 후 · 직접 입력은 바로</small></div>
  <button type="button" className="home-entry-secondary" onClick={()=>onChoose('recommend')}><span><small>재료가 없거나 다른 음식이 당긴다면</small><strong>새로운 메뉴 추천받기</strong><span>재료 입력 없이 메뉴부터 골라요.</span></span><b aria-hidden="true">↗</b></button>
 </section>;
}
