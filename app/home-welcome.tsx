import Link from 'next/link';
import {HomeSavedPlan} from './home-saved-plan';
import {HealthSourcesNotice} from './health-sources-notice';
import {RiceBuddy} from './rice-buddy';
import './home-welcome.css';

export function HomeWelcome({onRecommend,onPantry,onPlan,userId,focused=false}:{onRecommend:()=>void;onPantry?:()=>void;onPlan?:()=>void;userId?:string;focused?:boolean}){
 return <div className="welcome-home">
  {userId&&onPlan&&<HomeSavedPlan key={userId} userId={userId} onOpen={onPlan}/>}
  <section className="welcome-hero">
   <div className="welcome-copy"><span>끼니와 함께, 오늘도</span><h2 id="planner-title">{focused?<>미리 준비하는<br/>나의 식단</>:<>뭐 먹을지 고민 끝.<br/>오늘도 맛있는 한 끼</>}</h2><p>{focused?'기간과 취향을 정하면 며칠 치 메뉴를 함께 골라드려요.':onPantry?'재료 등록 없이, 오늘 먹을 메뉴부터 골라보세요.':'나에게 맞는 메뉴를 골라드릴게요.'}</p></div>
   <div className="welcome-art" aria-hidden="true"><span className="welcome-orbit"/><span className="welcome-spark">✦</span><RiceBuddy stage={4}/><span className="welcome-art-note">오늘도 잘 챙겨요!</span></div>
   <button className="welcome-recommend-button" type="button" onClick={onRecommend}>{focused?'미리 식단 짜기':onPantry?'오늘 먹을 메뉴 찾기':'식단 추천받기'} <span aria-hidden="true">↗</span></button>
  </section>
  <div className="welcome-planning-paths">
   {onPantry&&<button type="button" onClick={onPantry}><span className="welcome-path-label">냉장고부터</span><strong>있는 재료로 한 끼</strong><small>재료 몇 개만 알려주세요.<br/>더 필요한 재료도 확인해요.</small><span aria-hidden="true">→</span></button>}
   {onPlan&&<button type="button" onClick={onPlan}><span className="welcome-path-label">미리 준비하기</span><strong>며칠 치 식단 짜기</strong><small>먹을 끼니만 골라 계획하고<br/>장볼 재료를 함께 모아요.</small><span aria-hidden="true">→</span></button>}
  </div>
  <HealthSourcesNotice compact/>
  {!focused&&<><div className="welcome-section-label"><h3>한 끼를 더 편하게</h3><span>필요한 것만 쏙</span></div>
  <div className="welcome-shortcuts">
   <Link href="/record" className="welcome-tile record"><span className="welcome-tile-copy"><strong>먹은 음식 기록</strong><small>사진으로 남기거나 이름으로 검색</small></span><span className="welcome-tile-icon" aria-hidden="true"><svg viewBox="0 0 64 64"><rect x="10" y="19" width="44" height="33" rx="9"/><path d="m22 19 4-7h12l4 7"/><circle cx="32" cy="35" r="10"/><path d="M46 26h1"/></svg></span><span className="welcome-tile-arrow" aria-hidden="true">↗</span></Link>
   <Link href="/convenience" className="welcome-tile convenience"><span className="welcome-tile-copy"><strong>요리 쉬는 날</strong><small>편의점에서 한 끼 찾기</small></span><span className="welcome-tile-icon" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M15 23h34l4 32H11z"/><path d="M23 24v-7a9 9 0 0 1 18 0v7M23 37q9 12 18 0"/></svg></span><span className="welcome-tile-arrow" aria-hidden="true">↗</span></Link>
  </div></>}
 </div>;
}
