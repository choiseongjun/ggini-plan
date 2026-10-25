import Link from 'next/link';
import {AppShell,Brand} from '../app-shell';
import {RiceBuddy} from '../rice-buddy';
import {pageMetadata} from '../../lib/seo';
import './how-to.css';

export const metadata=pageMetadata('사진 식사 기록·영양소 확인 사용법 | 끼니플랜','사진으로 음식을 찾고 먹은 양을 확인해 한 끼의 영양정보를 기록해요.','/how-to');

export default function HowTo(){
 return <AppShell><header className="app-header"><Brand/><Link className="tutorial-home" href="/">홈으로</Link></header><div className="app-content tutorial-content">
  <section className="tutorial-welcome"><div><span>처음 만나는 끼니플랜</span><h1>한 끼부터,<br/>같이 시작해요.</h1><p>끼니플랜은 사진이나 음식 이름으로 식사를 기록하고, 하루의 영양과 식습관을 돌아보는 서비스예요.</p></div><RiceBuddy/></section>
  <Link className="tutorial-live-start" href="/?guide=start">화면에서 직접 따라 해보기</Link>
  <section className="tutorial-map" aria-label="주요 메뉴 안내"><h2>기록부터 통계까지 한눈에</h2><Link href="/"><strong>오늘</strong><span>사진으로 한 끼를 남기고 오늘 영양을 확인해요</span></Link><Link href="/record"><strong>식사 일기</strong><span>날짜별 식사와 영양을 돌아봐요</span></Link><Link href="/stats"><strong>통계</strong><span>기록한 식사와 영양의 흐름을 살펴봐요</span></Link><Link href="/profile"><strong>마이</strong><span>내 정보와 목표·식사 알림을 설정해요</span></Link><p>음식과 먹은 양을 확인하고 저장하면 하루의 영양정보가 모여요.</p></section>
  <nav className="tutorial-index" aria-label="사용법 목차"><a href="#recommend">사진 선택</a><a href="#record">음식 확인·저장</a><a href="#customize">목표·통계</a><a href="#shopping">다음 식사 준비</a><a href="#companion">끼니 키우기</a></nav>
  <section className="tutorial-step" id="recommend"><span className="tutorial-number">01</span><h2>사진으로 한 끼를 시작해요</h2><p>오늘 홈에서 사진을 선택하고 로그인한 뒤, 사진 전송에 동의하고 ‘AI로 음식 찾기’를 누르세요. Groq 서버에서 음식 후보를 찾아요. 별도 모델 다운로드는 필요하지 않으며 무료 분석 횟수에는 제한이 있어요.</p><div className="tutorial-example"><span>음식은 직접 확인해요</span><p>한식·반찬·여러 음식이 섞인 사진은 잘못 분류할 수 있어요. 틀린 음식 이름을 고치거나 ‘AI 없이 음식 직접 입력’으로 사진 속 여러 음식을 직접 추가할 수 있어요.</p></div><Link href="/">한 끼 기록하러 가기</Link></section>
  <section className="tutorial-step" id="record"><span className="tutorial-number">02</span><h2>먹은 양을 확인하고 저장해요</h2><p>실제 먹은 음식을 고르고, 기준 제공량을 확인한 뒤 먹은 양을 조정해 주세요. 영양정보를 확인하고 로그인하면 음식과 분량을 일기에 저장해요. 사진만으로 정확한 양이나 조리법을 확정하지 않아요.</p><p>홈에서 선택한 사진은 이 기기에 임시 보관돼요. 분석에 실패해도 이름으로 찾아 이어갈 수 있어요. 최종 저장을 누르면 사진도 내 일기에 업로드하며, 임시 보관만 한 식사는 영양 합계에 포함하지 않아요. 브라우저 데이터를 삭제하면 임시 보관함도 사라져요. 기존 추천 메뉴의 서버 사진 분석은 해당 화면의 별도 전송 안내를 따라요. 식사 일기에서 날짜별 기록을 보고 양 수정·삭제를 할 수 있어요.</p><Link href="/record">식사 일기로</Link></section>
  <section className="tutorial-step" id="customize"><span className="tutorial-number">03</span><h2>나의 목표와 기록 흐름을 확인해요</h2><p>체중 감량·근육 증가·건강 유지 중 관리 모드를 고르고, 마이에서 신체 정보와 영양 목표를 설정해요. 통계에서는 실제로 기록한 식사의 섭취 흐름을 확인할 수 있어요.</p><Link href="/stats">나의 통계 보기</Link></section>
  <section className="tutorial-step" id="shopping"><span className="tutorial-number">04</span><h2>필요한 재료를 챙겨요</h2><p>홈의 ‘내 냉장고’에서 재료를 등록하고 메뉴를 추천받을 수 있어요. 기존 장보기 목록도 아래 링크에서 이용할 수 있어요.</p><Link href="/cart">장보기 목록 보기</Link></section>
  <section className="tutorial-step" id="companion"><span className="tutorial-number">05</span><h2>식사 친구 끼니와 함께 자라요</h2><p>로그인하고 식사를 기록하면 <strong>기록한 날</strong>이 쌓여요. 1·3·7·14·30일에 스카프, 앞치마, 브로치, 모자, 메달이 차례로 열려요.</p><ul><li>하루 여러 끼를 기록해도 성장은 하루로 계산해요.</li><li>하루 쉬어도 성장이 줄어들지 않아요. 기록을 삭제하면 기록한 날은 다시 계산돼요.</li><li>끼니를 누르면 인사하고, 가만히 있어도 말을 걸어요. ‘잠깐 쉬기’로 자동 반응을 멈출 수 있어요.</li></ul><Link href="/profile#buddy-companion">내 끼니 만나기</Link></section>
  <section className="tutorial-faq" aria-label="자주 묻는 질문"><h2>이것도 궁금해요</h2><details><summary>처음부터 키와 체중을 입력해야 하나요?</summary><p>아니요. 먼저 먹은 한 끼부터 기록해 보세요. 내 몸에 맞는 칼로리·영양 목표를 설정하고 싶을 때 마이페이지에서 입력하면 돼요.</p></details><details><summary>로그인은 언제 필요한가요?</summary><p>나의 식사 기록과 성장 내역을 계정에 저장하고 이어가려면 로그인해 주세요. 로그인이 필요한 기능에서는 로그인 안내가 나와요.</p></details><details><summary>식사 알림은 어디서 설정하나요?</summary><p>로그인 후 마이페이지의 ‘식사 알림’에서 켜고 끄거나 끼니별 시간을 바꿀 수 있어요. 앱에서는 기기 설정의 알림 허용이 필요해요.</p><Link href="/profile#meal-reminders">식사 알림 설정으로</Link></details></section>
  <Link className="tutorial-start" href="/">첫 한 끼 기록하러 가기</Link>
 </div></AppShell>;
}
