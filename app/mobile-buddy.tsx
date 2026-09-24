import {RiceBuddy} from './rice-buddy';
import './mobile-buddy.css';

export function MobileBuddy(){
 return <section className="mobile-buddy" aria-label="밥 친구 끼니랑"><div className="mobile-buddy-copy"><span className="buddy-greeting">나를 챙기는 작은 습관</span><h2>오늘도 맛있게,<br/>나답게 먹어요<span>.</span></h2><p>메뉴 고민은 끼니에게 맡겨요.</p></div><div className="mobile-buddy-scene" aria-hidden="true"><div className="mobile-buddy-circle"><RiceBuddy/></div><span className="mobile-buddy-spark">✦</span><span className="buddy-hello">같이 잘 먹자!</span></div></section>;
}
