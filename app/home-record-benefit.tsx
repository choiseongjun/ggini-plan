import Link from 'next/link';
import './home-record-benefit.css';

export function HomeRecordBenefit({compact=false}:{compact?:boolean}){
 return <aside className={`home-record-benefit${compact?' is-compact':''}`} aria-label="식사를 기록하면 좋은 점">
  <span className="home-record-benefit-kicker">먹고 나서는, 사진 한 장</span>
  <h3>오늘 먹은 한 끼, 기록하기</h3>
  {!compact&&<ul>
   <li><strong>오늘의 영양</strong><span>칼로리·단백질 확인</span></li>
   <li><strong>이번 주 식사</strong><span>사진과 영양 모아보기</span></li>
  </ul>}
  <p>추천과 다른 음식·간식도 기록해요.</p>
  <Link href="/record">한 끼 기록하기 <span aria-hidden="true">→</span></Link>
  {!compact&&<small>영양정보는 기록한 음식 기준이며, 사진 분석은 추정치예요.</small>}
 </aside>;
}
