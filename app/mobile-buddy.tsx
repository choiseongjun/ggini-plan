import {RiceBuddy} from './rice-buddy';
import './mobile-buddy.css';

export function MobileBuddy({titleId}:{titleId?:string}){
 return <section className="mobile-buddy" aria-label="밥 친구 끼니랑"><div className="mobile-buddy-copy"><span className="buddy-greeting">바쁜 하루, 혼자 먹어도 잘 챙겨요</span><h2 id={titleId}>퇴근 후,<br/>오늘 뭐 먹지?</h2><p>메뉴 고민은 추천으로 덜고,<br/>사진 기록으로 먹은 영양을 확인해요.</p></div><div className="mobile-buddy-scene" aria-hidden="true"><div className="mobile-buddy-circle"><RiceBuddy/></div><span className="mobile-buddy-spark">✦</span><span className="buddy-hello">같이 잘 먹자!</span></div></section>;
}
