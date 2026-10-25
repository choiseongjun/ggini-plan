import {ServiceFeedback} from '../service-feedback';
import Image from 'next/image';
import Link from 'next/link';
import {pageMetadata,siteUrl} from '../../lib/seo';
import {brandCopy} from '../../lib/brand-copy';
import {RiceBuddy} from '../rice-buddy';
import {IntroStart} from './preview';
import './intro.css';

export const metadata=pageMetadata('사진 식사 기록 앱 소개 | 끼니플랜',brandCopy.description,'/intro');
export default function IntroPage(){
 return <div className="intro-page">
  <header className="intro-nav"><Link href="/intro" className="intro-logo" aria-label="끼니플랜 소개"><span aria-hidden="true">✳</span> 끼니플랜.</Link><nav aria-label="소개 메뉴"><a href="#how">어떻게 쓰나요?</a><IntroStart small/></nav></header>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({'@context':'https://schema.org','@type':'WebPage',name:'사진 식사 기록 앱 소개 | 끼니플랜',url:siteUrl+'/intro',inLanguage:'ko-KR',description:brandCopy.description,isPartOf:{'@type':'WebSite',name:'끼니플랜',url:siteUrl}}).replace(/</g,'\\u003c')}}/>
  <main>
   <section className="intro-hero">
    <div className="intro-hero-copy"><span className="intro-eyebrow">사진으로 남기는 식사·영양 기록</span><h1>한 끼를 기록하고,<br/><em>오늘의 나를<br/>챙겨요.</em></h1><p>사진이나 음식 이름으로 간편하게.<br/>먹은 양을 확인하면 하루의 영양이 모여요.</p><IntroStart/><small>사진 분석은 무료 베타 · 분석과 일기 저장은 로그인 후</small></div>
    <div className="intro-hero-visual"><Image src="https://static.wtable.co.kr/image/production/service/recipe/1910/d84bf879-ebd4-490f-b336-f945594704de.jpg?size=800x800" alt="식사 일기로 남길 수 있는 두부구이 한 접시" unoptimized fill sizes="(max-width: 760px) 100vw, 55vw" priority/><div className="intro-photo-caption">오늘 먹은 한 끼, 나를 알아가는 기록.</div><div className="intro-buddy-note"><RiceBuddy/><span>완벽하지 않아도 괜찮아요.<br/><b>한 끼부터 남겨요!</b></span></div></div>
   </section>
   <div className="intro-strip"><span>사진으로 시작</span><span>먹은 양은 직접 확인</span><span>영양은 한눈에</span></div>
   <section id="how" className="intro-how"><div className="intro-section-heading"><span className="intro-eyebrow">01 / 가볍게 시작해요</span><h2>먹은 한 끼를,<br/>사진 한 장으로.</h2><p>촬영하거나 앨범에서 사진을 골라요.<br/>사진이 없을 때는 음식 이름으로 찾아 기록해요.</p><IntroStart/></div><div className="intro-record-flow"><div><span className="intro-step">1</span><strong>사진 선택 또는 음식 검색</strong><p>집밥도, 외식도, 간식도</p></div><span aria-hidden="true">↓</span><div><span className="intro-step">2</span><strong>음식과 먹은 양 확인</strong><p>틀린 이름 수정 · 빠진 음식 추가</p></div><span aria-hidden="true">↓</span><div><span className="intro-step">3</span><strong>한 끼 함께 저장</strong><p>사진 속 여러 음식을 한 번에</p></div></div></section>
   <section className="intro-record"><div className="intro-section-heading"><span className="intro-eyebrow">02 / 내 식사를 돌아봐요</span><h2>무엇을 먹었는지,<br/>얼마나 챙겼는지.</h2><p>칼로리와 탄수화물·단백질·지방을 확인하고,<br/>식사 일기와 통계에서 기록의 흐름을 살펴봐요.</p><Link href="/stats" className="intro-text-link">나의 통계 보기 ↗</Link></div><div className="intro-record-flow"><div><strong>식사 일기</strong><p>날짜별 사진과 먹은 음식 모아보기</p></div><div><strong>영양 기록</strong><p>선택한 음식과 분량을 기준으로 계산</p></div><div><strong>나의 통계</strong><p>기록한 날의 섭취 흐름 돌아보기</p></div><small>기록하지 않은 식사는 합계에 포함되지 않아요. 영양정보가 없는 음식은 미확인으로 남겨요.</small></div></section>
   <section className="intro-faq" aria-labelledby="intro-features"><h2 id="intro-features">나를 챙기는 기록을 이어가세요</h2><ul><li><strong>나의 목표:</strong> 체중 감량·근육 증가·건강 유지 중 관리 모드를 선택해요.</li><li><strong>물 기록:</strong> 마신 양을 기록하고 확인해요.</li><li><strong>식사 알림:</strong> 원하는 시간에 기록을 떠올릴 수 있도록 설정해요.</li><li><strong>다음 식사 준비:</strong> 필요할 때 냉장고 재료와 메뉴 추천을 활용해요.</li></ul><Link href="/how-to" className="intro-text-link">식사 기록 사용법 보기 →</Link></section>
   <section className="intro-faq" aria-label="자주 묻는 질문"><h2>궁금한 점이 있나요?</h2><details><summary>사진으로 칼로리를 정확히 알 수 있나요?</summary><p>사진만으로 음식의 양이나 조리법을 확정할 수는 없어요. AI가 제안한 음식 이름을 확인하고 영양 기준과 먹은 양을 직접 조정해 주세요. 영양정보는 선택한 음식과 분량을 기준으로 계산해요.</p></details><details><summary>AI가 음식을 잘못 찾으면 어떻게 하나요?</summary><p>음식 이름을 고치거나 빠진 음식을 추가할 수 있어요. AI 없이 직접 입력할 수도 있고, 맞는 영양정보가 없으면 사진과 이름만 기록할 수 있어요.</p></details><details><summary>사진 분석은 무료인가요?</summary><p>현재 무료 베타로 계정당 하루 5회 이용할 수 있어요. 서비스 전체 한도에 따라 먼저 마감될 수 있고 실패한 요청도 횟수에 포함될 수 있어요. 한도는 UTC 날짜 기준이에요.</p></details><details><summary>사진을 고르면 바로 저장되나요?</summary><p>선택한 사진은 우선 이 기기에 임시 보관돼요. 분석할 때는 전송 안내에 동의한 사진을 Groq로 보내며, 최종 저장하면 내 식사 일기에 사진을 함께 보관해요.</p></details><details><summary>매일 빠짐없이 기록해야 하나요?</summary><p>한 끼부터 시작해도 괜찮아요. 기록이 없는 날을 굶은 날로 판단하지 않아요.</p></details></section>
   <section className="intro-faq" id="share-experience" aria-labelledby="intro-feedback"><h2 id="intro-feedback">기록하다 불편했던 점을 알려주세요</h2><p>사진 선택, 음식 수정, 먹은 양 입력 중 어디에서 막혔나요? 더 편하게 한 끼를 남길 수 있도록 의견을 모으고 있어요.</p><p>의견은 관리자에게 전달되며 자동으로 공개되지 않아요.</p><ServiceFeedback page="/intro#share-experience"/></section>
   <section className="intro-finish"><RiceBuddy stage={1}/><span className="intro-eyebrow">오늘의 나를 챙기는 작은 시작</span><h2>오늘 먹은 한 끼,<br/>남겨볼까요?</h2><IntroStart/></section>
  </main>
  <footer className="intro-footer"><Link href="/" className="intro-logo">끼니플랜.</Link><span>{brandCopy.tagline}</span><div><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보처리방침</Link><a href="mailto:choisj2702@gmail.com">문의</a></div></footer>
 </div>;
}
