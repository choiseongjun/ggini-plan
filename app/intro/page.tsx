import {ServiceFeedback} from '../service-feedback';
import Image from 'next/image';
import Link from 'next/link';
import {pageMetadata,siteUrl} from '../../lib/seo';
import {RiceBuddy} from '../rice-buddy';
import {IntroDemo,IntroStart} from './preview';
import './intro.css';

export const metadata=pageMetadata('자취 식단 추천·사진 식사 기록·장보기 앱 | 끼니플랜','퇴근 후 메뉴가 고민인 직장인을 위한 일주일 식단 추천. 취향·예산·조리 부담에 맞춰 메뉴를 고르고, 사진 식사 기록과 주간 피드백으로 식습관을 돌아보세요.','/intro');

export default function IntroPage(){
 return <div className="intro-page">
  <header className="intro-nav"><Link href="/intro" className="intro-logo" aria-label="끼니플랜 소개"><span aria-hidden="true">✳</span> 끼니플랜.</Link><nav aria-label="소개 메뉴"><a href="#how">어떻게 쓰나요?</a><IntroStart small/></nav></header>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@type':'WebPage',name:'자취 식단 추천·사진 식사 기록·장보기 앱 | 끼니플랜',url:siteUrl+'/intro',inLanguage:'ko-KR',description:'취향과 예산에 맞춘 일주일 식단 추천, 음식 사진 기록과 주간 피드백',isPartOf:{'@type':'WebSite',name:'끼니플랜',url:siteUrl}}).replace(/</g,'\\u003c')}}/>
  <main>
   <section className="intro-hero">
    <div className="intro-hero-copy"><span className="intro-eyebrow">1인 가구 직장인을 위한 식단 추천</span><h1>퇴근 후,<br/>뭐 먹을지<br/><em>고민 끝.</em></h1><p>자취 식단 추천부터 필요한 재료 장보기까지.<br/>먹은 한 끼는 사진이나 음식 검색으로 남겨요.</p><IntroStart/><small>추천은 로그인 없이 · 기록은 로그인 후</small></div>
    <div className="intro-hero-visual"><Image src="https://static.wtable.co.kr/image/production/service/recipe/1910/d84bf879-ebd4-490f-b336-f945594704de.jpg?size=800x800" alt="접시에 담은 두부구이 음식 사진" unoptimized fill sizes="(max-width: 760px) 100vw, 55vw" priority/><div className="intro-photo-caption">오늘도, 나를 위한 한 그릇.</div><div className="intro-buddy-note"><RiceBuddy/><span>완벽하지 않아도 괜찮아요.<br/><b>한 끼부터 같이 해요!</b></span></div></div>
   </section>
   <div className="intro-strip"><span>메뉴 고민은 짧게</span><span>내 취향은 그대로</span><span>기록은 가볍게</span></div>
   <section id="how" className="intro-how"><div className="intro-section-heading"><span className="intro-eyebrow">01 / 내 일상에 맞게</span><h2>아침은 간단히.<br/>저녁은 든든하게.</h2><p>챙길 끼니, 식사 구성, 예산을 고르면<br/>일주일 메뉴와 필요한 재료를 함께 준비해요.</p></div><div className="intro-week" aria-label="일주일 식단 구성 예시"><div className="intro-week-top"><strong>이번 주, 이렇게 먹어요</strong><span>구성 예시</span></div>{[['월','달걀 토스트','두부구이 + 나물'],['화','요거트와 과일','닭고기 채소볶음'],['수','따뜻한 달걀죽','소불고기 + 오이무침']].map(([day,morning,dinner])=><div className="intro-week-row" key={day}><b>{day}</b><div><small>아침 · 간단하게</small><strong>{morning}</strong></div><div><small>저녁 · 밥과 반찬</small><strong>{dinner}</strong></div></div>)}<div className="intro-week-foot">취향 · 못 먹는 재료 · 조리 부담까지 고려</div></div></section>
   <section className="intro-swap"><div className="intro-section-heading"><span className="intro-eyebrow">02 / 마음이 바뀌어도 괜찮아요</span><h2>이 메뉴 말고,<br/>비슷한 다른 메뉴.</h2><p>다시 처음부터 고를 필요 없어요.<br/>대안을 보고, 바꾸고 싶은 끼니만 쏙.</p><span className="intro-try">메뉴 교체를 직접 체험해 보세요 ↗</span></div><IntroDemo/></section>
   <section className="intro-record"><div className="intro-section-heading"><span className="intro-eyebrow">03 / 먹은 한 끼가 쌓이면</span><h2>먹고, 남기고.<br/>다음 주는 나답게.</h2><p>추천과 다른 음식도, 가벼운 간식도.<br/>사진이나 음식 검색으로 남겨요.</p><Link href="/record" className="intro-text-link">먹은 음식 기록하기 ↗</Link></div><div className="intro-record-flow"><div><span className="intro-step">1</span><strong>한 끼 기록</strong><p>사진 또는 음식 검색</p></div><span aria-hidden="true">↓</span><div><span className="intro-step">2</span><strong>주간 피드백</strong><p>기록한 식사와 영양 돌아보기</p></div><span aria-hidden="true">↓</span><div><span className="intro-step">3</span><strong>다음 주 식단</strong><p>기록을 참고한 메뉴 제안</p></div><small>사진 영양정보는 추정치예요. 피드백은 기록된 식사 기준이에요.</small></div></section>
   <section className="intro-faq" aria-labelledby="intro-features"><h2 id="intro-features">끼니플랜에서 할 수 있는 일</h2><p>혼자 먹는 평일 저녁부터 시작해 보세요. 메뉴를 정하고, 필요한 재료를 확인하고, 실제로 먹은 음식을 기록할 수 있어요.</p><ul><li><strong>식단 추천:</strong> 인원·끼니·취향·예산에 맞춰 메뉴를 고르고 바꿀 수 있어요.</li><li><strong>장보기:</strong> 필요한 재료와 양을 모아 보고, 등록된 판매 상품의 가격·용량을 비교해요. 구매는 판매처에서 진행해요.</li><li><strong>식사 기록:</strong> 사진 분석 또는 음식 검색으로 기록해요. 사진 속 음식과 영양정보는 틀릴 수 있는 추정치예요.</li></ul><p>예상 재료비와 실제 포장 단위의 결제액은 다를 수 있어요. 구매 전 최종 가격·배송비를 확인해 주세요.</p><Link href="/guides/three-dinners-walkthrough" className="intro-text-link">평일 저녁 3끼 사용 예시 보기 →</Link></section>
   <section className="intro-faq" aria-labelledby="intro-guides"><h2 id="intro-guides">자취 식단과 혼밥, 여기서 시작하세요</h2><ul><li><Link href="/guides/easy-weekly-meal-plan">자취생 일주일 식단 추천: 집에서 먹는 끼니부터</Link></li><li><Link href="/guides/grocery-list-for-one">일주일 식단 장보기: 필요한 양과 구매 단위 비교</Link></li><li><Link href="/guides/solo-dinner-ideas">혼밥 메뉴 추천: 퇴근 후 고르는 간단한 저녁</Link></li></ul></section>
   <section className="intro-faq" id="share-experience" aria-labelledby="intro-feedback"><h2 id="intro-feedback">직접 한 끼 준비해 보고 알려주세요</h2><p>추천 메뉴를 실제로 먹어 보셨나요? 고른 메뉴, 장보기에서 도움이 된 점, 막혔던 부분을 알려주세요. 영수증이 있다면 개인정보를 제외한 실제 결제 금액과 예상 금액의 차이도 적어 주세요.</p><p>아래 의견은 관리자에게만 전달되며 자동으로 공개되지 않아요. 공개 사용 사례로 소개하려면 별도 동의를 받은 내용만 사용합니다.</p><ServiceFeedback page="/intro#share-experience"/></section>
   <section className="intro-finish"><RiceBuddy stage={1}/><span className="intro-eyebrow">오늘의 나를 챙기는 작은 시작</span><h2>오늘 뭐 먹을지,<br/>같이 골라볼까요?</h2><IntroStart/></section>
   <section className="intro-faq" aria-label="자주 묻는 질문"><h2>궁금한 점이 있나요?</h2><details><summary>꼭 추천받은 음식을 먹어야 하나요?</summary><p>아니요. 메뉴를 바꿔도 되고, 다른 음식이나 간식을 먹었다면 실제로 먹은 음식을 기록하면 돼요.</p></details><details><summary>매일 빠짐없이 기록해야 하나요?</summary><p>부담 없는 한 끼부터 시작하세요. 기록이 없는 날을 굶은 날로 판단하지 않아요.</p></details><details><summary>추천받으면 식재료가 주문되나요?</summary><p>자동으로 주문되거나 결제되지 않아요. 식단과 필요한 재료를 확인할 수 있고, 예상 금액은 실제 구매 가격과 다를 수 있어요.</p></details></section>
  </main>
  <footer className="intro-footer"><Link href="/" className="intro-logo">끼니플랜.</Link><span>혼자 먹어도, 나를 위해 잘 먹기.</span><div><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보처리방침</Link><a href="mailto:choisj2702@gmail.com">문의</a></div></footer>
 </div>;
}
