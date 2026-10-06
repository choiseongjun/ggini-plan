import {Icon,type IconName} from '../components/icons';
import styles from './ux.module.css';

const journey=[
 ['고민','지금 뭘 먹지?','오늘','식단 추천 또는 외식 선택','첫 행동을 바로 찾게 해요'],
 ['선택','내 조건에 맞을까?','식단','끼니·예산 설정과 메뉴 교체','필요할 때만 조건을 펼쳐요'],
 ['준비','무엇을 사야 하지?','장보기','살 재료와 보유 재료 확인','사용량과 구매량을 구분해요'],
 ['식사','실제로 무엇을 먹었지?','기록','사진·검색으로 식사 저장','추천 없이도 기록할 수 있어요'],
 ['돌아보기','다음에는 어떻게 먹지?','마이','피드백과 목표 확인','다음 식사 준비로 이어져요'],
];
const flows=[
 {title:'오늘 먹을 메뉴 찾기',start:'메뉴가 고민인 사용자',steps:['오늘 · 식사 방법 선택','집에서·외식·편의점 추천','메뉴 확인·교체','재료·조리법 확인','필요한 재료 준비'],decision:'계정 저장이 필요한가요?',yes:'로그인 후 선택한 작업을 이어가요',no:'비회원 추천과 기기 저장 범위에서 이용해요',exception:'추천 후보가 부족하면 조건을 바꾸거나 직접 메뉴를 골라요.'},
 {title:'며칠 치 식단과 장보기',start:'미리 준비하려는 사용자',steps:['식단','기간·끼니·예산','추천·조정·저장','장보기 목록','판매처 이동·상태 입력'],decision:'이미 보유한 상품이 있나요?',yes:'연결 가능한 보유 수량을 구매량 계산에 반영해요',no:'필요한 판매 단위를 확인해요',exception:'외부 판매처 이동만으로 주문·수령 완료가 되지 않아요.'},
 {title:'내 재료로 요리 찾기',start:'집에 재료가 있는 사용자',steps:['장보기 → 내 재료','사진·직접 입력','가능한 메뉴 탐색','재료·조리법 확인','식사 기록'],decision:'부족한 재료를 더 사도 되나요?',yes:'추가 구매가 필요한 메뉴도 함께 살펴봐요',no:'보유 재료 중심으로 후보를 좁혀요',exception:'재료 목록과 구매 재고는 모든 항목이 자동 동기화되는 구조가 아니에요.'},
 {title:'추천 없이 한 끼 기록',start:'이미 식사한 사용자',steps:['기록','사진 또는 검색','로그인 후 이어가기','음식·양·끼니 확인','저장·일기 확인'],decision:'사진 분석이 잘 되었나요?',yes:'결과를 확인·수정한 뒤 저장해요',no:'사진을 다시 선택하거나 음식 검색으로 기록해요',exception:'저장 실패 시 성공으로 표시하지 않고 재시도할 수 있게 해요.'},
 {title:'기록을 보고 다음 식사 준비',start:'습관을 돌아보는 사용자',steps:['마이','식사 습관 돌아보기','주간 피드백','필요하면 목표 수정','다음 식단 준비'],decision:'기록이 충분히 있나요?',yes:'실제 기록을 바탕으로 피드백을 읽어요',no:'부족한 기록을 안내하고 한 끼 기록으로 연결해요',exception:'기록이 없는 상태를 0 섭취나 확정된 평가로 설명하지 않아요.'},
];
const screens:{name:string;icon:IconName;question:string;primary:string;blocks:string[];fold:string;tab:string}[]=[
 {name:'오늘',icon:'home',question:'오늘 무엇을 먹을까요?',primary:'오늘 식단 추천받기',blocks:['집에서 · 외식 · 편의점 탭','선택한 메뉴 · 재료와 조리법','미리 식단 짜기 바로가기'],fold:'추천 반영 내용 · 식단 공유',tab:'오늘'},
 {name:'식단',icon:'calendar',question:'앞으로 먹을 식단을 준비해요',primary:'내 식단 추천받기',blocks:['미리 짜기 · 식단 달력','기간 · 끼니 · 예산','직접 메뉴 선택 · 저장 식단 불러오기'],fold:'이번 주 식단 가이드',tab:'식단'},
 {name:'장보기',icon:'bag',question:'이번에 필요한 재료를 챙겨요',primary:'살 재료 확인',blocks:['살 재료 · 상품 찾기 · 내 재료','필요량과 구매 상태','판매처와 가격 확인'],fold:'공유받은 장보기 목록',tab:'장보기'},
 {name:'기록',icon:'edit',question:'오늘 무엇을 드셨나요?',primary:'사진 또는 검색으로 기록',blocks:['날짜와 끼니 선택','식사 일기와 사진','기록 수정과 삭제'],fold:'영양 합계 · 식비 · 물과 체중',tab:'기록'},
 {name:'마이',icon:'user',question:'내 몸과 식사 취향을 맞춰요',primary:'내 정보 수정',blocks:['계정 관리와 회원 탈퇴','내 정보 · 목표 · 식사 알림','끼니 성장과 배지'],fold:'주간 피드백 · 예산 · 데이터 관리',tab:'마이'},
];

export function UxOverview(){
 return <div className={styles.overview} aria-label="시각 자료 바로가기">{[['#user-journey','사용자 여정','사용자의 질문과 행동'],['#screen-map','화면 이동 관계','다섯 영역의 연결'],['#user-flows','사용자 흐름','상황별 시작과 분기'],['#wireframes','모바일 화면 구성','핵심 행동과 상세 정보']].map(([href,title,text])=><a key={href} href={href}><strong>{title}</strong><span>{text}</span><Icon name="arrow" size={17}/></a>)}</div>;
}

export function UserJourney(){
 return <figure className={styles.figure} id="user-journey"><h3>사용자 여정 지도</h3><p>한 사용자의 대표적인 식사 준비 과정이에요. 기록부터 시작하거나 중간 단계를 건너뛸 수도 있어요.</p><ol className={styles.journey}>{journey.map(([stage,question,area,action,ux],i)=><li key={stage}><span className={styles.step}>{i+1}</span><h4>{stage}</h4><blockquote>{question}</blockquote><dl><dt>방문 영역</dt><dd>{area}</dd><dt>사용자 행동</dt><dd>{action}</dd><dt>화면 설계 기준</dt><dd>{ux}</dd></dl></li>)}</ol><figcaption>사용자가 느끼는 질문 → 방문할 영역 → 행동 → 화면이 도와줄 방법을 함께 읽어요.</figcaption></figure>;
}

export function ScreenMap(){
 return <figure className={styles.figure} id="screen-map"><h3>화면 사이 이동 관계</h3><p>기능의 기본 소속은 하나로 유지하고, 다음 행동이 필요한 화면에 바로가기를 연결해요.</p><ol className={styles.connections}>{[
 ['오늘','기록','선택한 메뉴를 먹었거나 다른 음식을 먹었을 때'],
 ['식단','장보기','미리 만든 식단의 필요한 재료를 준비할 때'],
 ['장보기의 내 재료','오늘·식단','보유 재료로 가능한 요리를 찾아 준비할 때'],
 ['기록','마이','기록을 바탕으로 습관과 목표를 돌아볼 때'],
 ['마이','오늘·식단','취향과 목표를 수정한 뒤 다음 메뉴를 준비할 때'],
 ].map(([from,to,when])=><li key={from}><div><strong>{from}</strong><Icon name="arrow"/><strong>{to}</strong></div><span>{when}</span></li>)}</ol><figcaption>화면 이동은 저장·구매·섭취 완료를 의미하지 않아요. 실제 상태 변경은 해당 행동으로 처리해요.</figcaption></figure>;
}

export function UserFlows(){
 return <div className={styles.figure} id="user-flows"><h3>상황별 사용자 흐름</h3><p>필요한 상황을 펼치면 시작점, 진행 순서, 분기와 예외를 함께 볼 수 있어요.</p>{flows.map((flow,i)=><details className={styles.flow} key={flow.title} open={i===0}><summary><span>{String(i+1).padStart(2,'0')}</span>{flow.title}</summary><p className={styles.start}><Icon name="user" size={17}/>{flow.start}</p><ol className={styles.steps}>{flow.steps.map((step,index)=><li key={step}><span>{index+1}</span><strong>{step}</strong>{index<flow.steps.length-1&&<Icon name="arrow" size={17}/>}</li>)}</ol><div className={styles.decision}><h4>{flow.decision}</h4><div><p><b>예</b>{flow.yes}</p><p><b>아니요</b>{flow.no}</p></div></div><p className={styles.exception}><strong>예외와 주의할 상태</strong>{flow.exception}</p></details>)}</div>;
}

export function Wireframes(){
 return <figure className={styles.figure} id="wireframes"><h3>모바일 화면 구성안</h3><p>현재 기능을 바탕으로 정리한 배치 개념도예요. 실제 화면 캡처가 아니며, 세부 디자인과 버튼 강조는 후속 검수에서 조정해요.</p><div className={styles.phones}>{screens.map(screen=><section className={styles.phone} key={screen.name} aria-label={`${screen.name} 화면 구성안`}><header><Icon name={screen.icon}/><strong>{screen.name}</strong><span>구성안</span></header><h4>{screen.question}</h4><div className={styles.mainAction}>{screen.primary}</div><ol>{screen.blocks.map((block,i)=><li key={block}><span>{i+1}</span>{block}</li>)}</ol><div className={styles.fold}><strong>필요할 때 펼쳐 보기</strong><span>{screen.fold}</span></div><div className={styles.tabs}>{screens.map(item=><span key={item.name} className={item.name===screen.tab?styles.selected:undefined}>{item.name}</span>)}</div></section>)}</div><figcaption>위에서부터 핵심 행동 → 현재 정보 → 다음 행동 → 상세 정보 순서로 읽어요. 그림 속 요소는 설명용이며 실제 서비스 버튼이 아니에요.</figcaption></figure>;
}
