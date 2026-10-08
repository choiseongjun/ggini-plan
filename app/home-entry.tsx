'use client';

import {HomeVideoPicks} from './home-video-picks';
import {RiceBuddy} from './rice-buddy';
import './home-entry.css';

export function HomeEntry({onChoose}:{onChoose:(entry:'pantry'|'recommend')=>void}){
 return <section className="home-entry" aria-labelledby="home-entry-title">
  <div className="home-entry-heading"><span>오늘의 한 끼, 여기서 정해요</span><h2 id="home-entry-title">오늘 뭐 먹을까요?</h2><p>고민될 땐 메뉴부터 추천받아보세요.</p></div>
  <div className="home-entry-primary"><div className="home-entry-art" aria-hidden="true"><RiceBuddy stage={4}/></div><span className="home-entry-eyebrow">아직 메뉴를 못 정했다면</span><h3>오늘 먹을 메뉴부터</h3><p>재료 입력 없이 시작해요.<br/>추천 메뉴를 보고 원하는 끼니에 담아요.</p><button type="button" onClick={()=>onChoose('recommend')}>메뉴 추천받기 <span aria-hidden="true">→</span></button><small>로그인 없이 추천받을 수 있어요</small></div>
  <button type="button" className="home-entry-secondary" onClick={()=>onChoose('pantry')}><span><small>냉장고에 재료가 있다면</small><strong>집에 있는 재료로 추천받기</strong><span>재료를 알려주면 만들 메뉴를 찾아드려요.</span></span><b aria-hidden="true">↗</b></button>
  <HomeVideoPicks/>
 </section>;
}
