import Link from 'next/link';
import './home-record-benefit.css';

export function HomeRecordBenefit({compact=false}:{compact?:boolean}){
 return <aside className={`home-record-benefit${compact?' is-compact':''}`} aria-label="식사를 기록하면 좋은 점">
  <span className="home-record-benefit-kicker">먹고 나서는, 사진 한 장</span>
  <h3>{compact?'오늘 먹은 한 끼, 남겨볼까요?':'기록하면 무엇이 달라지나요?'}</h3>
  {!compact&&<ul>
   <li><strong>오늘은 얼마나 먹었는지</strong><span>기록한 음식의 칼로리·단백질 등 영양을 확인해요.</span></li>
   <li><strong>이번 주는 어떻게 먹었는지</strong><span>사진과 주별 영양 기록으로 내 식사를 돌아봐요.</span></li>
  </ul>}
  {compact&&<p>사진으로 추정 영양을 확인하고, 한 주의 식사를 돌아보세요.</p>}
  <p>매 끼니 채울 필요 없어요. 추천과 다른 음식·간식도 괜찮아요.</p>
  <Link href="/record">오늘 한 끼 기록하기 <span aria-hidden="true">→</span></Link>
  {!compact&&<small>영양정보는 기록한 음식 기준이며, 사진 분석은 추정치예요.</small>}
 </aside>;
}
