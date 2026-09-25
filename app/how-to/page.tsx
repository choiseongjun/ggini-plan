import Link from 'next/link';
import {AppShell,Brand} from '../app-shell';
import {RiceBuddy} from '../rice-buddy';
import {pageMetadata} from '../../lib/seo';
import './how-to.css';

export const metadata=pageMetadata('끼니플랜 사용법','식단 추천부터 상세설정, 장보기, 식사 기록과 끼니 키우기까지 처음부터 따라 해보세요.','/how-to');

export default function HowTo(){
 return <AppShell><header className="app-header"><Brand/><Link className="tutorial-home" href="/">홈으로</Link></header><div className="app-content tutorial-content">
  <section className="tutorial-welcome"><div><span>처음 만나는 끼니플랜</span><h1>한 끼부터,<br/>같이 시작해요.</h1><p>모든 설정을 채울 필요는 없어요.<br/>추천받고, 먹고, 기록하면 돼요.</p></div><RiceBuddy/></section>
  <nav className="tutorial-index" aria-label="사용법 목차"><a href="#recommend">식단 추천</a><a href="#customize">상세설정</a><a href="#shopping">장보기</a><a href="#record">식사 기록</a><a href="#companion">끼니 키우기</a></nav>
  <section className="tutorial-step" id="recommend"><span className="tutorial-number">01</span><h2>먼저 식단을 추천받아요</h2><p>홈에서 <strong>‘내 식단 추천받기’</strong>를 누르세요. 현재 조건으로 추천된 메뉴를 확인할 수 있어요.</p><div className="tutorial-example"><span>처음이라면 이렇게</span><p>우선 추천 메뉴를 살펴보고, 조건을 바꾸고 싶을 때 상세설정을 열어보세요.</p></div><Link href="/">홈에서 추천받기</Link></section>
  <section className="tutorial-step" id="customize"><span className="tutorial-number">02</span><h2>내 조건으로 추천받고 싶다면</h2><p>홈의 <strong>‘취향·못 먹는 재료 설정’</strong>을 누른 뒤 <strong>‘더 설정하기’</strong>를 펼치세요.</p><ul><li><strong>끼니 수와 시간</strong> — 몇 끼를 준비할지, 아침·점심·저녁 중 어떤 끼니를 챙길지 선택해요.</li><li><strong>인원과 재료비</strong> — 함께 먹을 사람 수와 재료비 조건을 정해요.</li><li><strong>피할 재료</strong> — 못 먹거나 피하고 싶은 재료를 선택해요.</li></ul><p>설정 후 <strong>‘이 조건으로 추천받기’</strong>를 누르면 돼요. 신체 정보와 영양 목표는 마이페이지에서 설정할 수 있어요.</p><Link href="/profile">마이페이지에서 내 정보 설정하기</Link></section>
  <section className="tutorial-step" id="shopping"><span className="tutorial-number">03</span><h2>필요한 재료를 챙겨요</h2><p>추천 결과에서 장보기 재료를 확인하세요. 보유하거나 준비한 재료를 표시하면 남은 재료를 파악하기 쉬워요.</p><div className="tutorial-example"><span>장보기 전에 한 번 더</span><p>집에 있는 재료부터 확인해 보세요. 상품을 구매할 때는 판매처의 현재 가격과 배송비를 확인해 주세요.</p></div><Link href="/cart">장보기 목록 보기</Link></section>
  <section className="tutorial-step" id="record"><span className="tutorial-number">04</span><h2>먹은 한 끼를 기록해요</h2><p>하단의 기록 탭에서 음식 검색 또는 사진으로 기록을 시작하세요. 추천·구매 등록 없이도 가능해요. 사진 기록은 음식 이름을 먼저 고른 뒤 식사량을 추정해요.</p><p>기록 탭에서 날짜를 골라 지난 식사를 보고, 양 수정·삭제도 할 수 있어요. 사진 원본은 보관하지 않으며 식사 내역이 저장돼요. 사진 기록은 화면의 전송·분석 안내를 확인한 뒤 진행해 주세요. 기록이 쌓이면 마이페이지의 <strong>주간 리포트</strong>에서 식사와 영양을 돌아볼 수 있어요.</p><Link href="/record">식사 기록하러 가기</Link></section>
  <section className="tutorial-step" id="companion"><span className="tutorial-number">05</span><h2>식사 친구 끼니와 함께 자라요</h2><p>로그인하고 식사를 기록하면 <strong>기록한 날</strong>이 쌓여요. 1·3·7·14·30일에 스카프, 앞치마, 브로치, 모자, 메달이 차례로 열려요.</p><ul><li>하루 여러 끼를 기록해도 성장은 하루로 계산해요.</li><li>하루 쉬어도 성장이 줄어들지 않아요. 기록을 삭제하면 기록한 날은 다시 계산돼요.</li><li>끼니를 누르면 인사하고, 가만히 있어도 말을 걸어요. ‘잠깐 쉬기’로 자동 반응을 멈출 수 있어요.</li></ul><Link href="/profile#buddy-companion">내 끼니 만나기</Link></section>
  <section className="tutorial-faq" aria-label="자주 묻는 질문"><h2>이것도 궁금해요</h2><details><summary>처음부터 키와 체중을 입력해야 하나요?</summary><p>아니요. 먼저 메뉴를 추천받아 보세요. 내 몸에 맞는 칼로리·영양 목표를 설정하고 싶을 때 마이페이지에서 입력하면 돼요.</p></details><details><summary>로그인은 언제 필요한가요?</summary><p>나의 식사 기록과 성장 내역을 계정에 저장하고 이어가려면 로그인해 주세요. 로그인이 필요한 기능에서는 로그인 안내가 나와요.</p></details><details><summary>식사 알림은 어디서 설정하나요?</summary><p>로그인 후 마이페이지의 ‘다음 식사도 잊지 않게’에서 설정해요. 브라우저와 기기의 알림 허용이 필요해요.</p><Link href="/profile#meal-reminders">식사 알림 설정으로</Link></details></section>
  <Link className="tutorial-start" href="/">이제 내 식단 추천받으러 가기</Link>
 </div></AppShell>;
}
