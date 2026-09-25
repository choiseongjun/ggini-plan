import {RiceBuddy} from './rice-buddy';
import './mobile-buddy.css';

export function MobileBuddy({titleId}:{titleId?:string}){
 return <section className="mobile-buddy" aria-label="밥 친구 끼니랑"><div className="mobile-buddy-copy"><span className="buddy-greeting">밥 친구 끼니와 함께</span><h2 id={titleId}>이번 주,<br/>뭐 먹을까요?</h2><p>메뉴 고민은 끼니에게 맡겨요.</p></div><div className="mobile-buddy-scene" aria-hidden="true"><div className="mobile-buddy-circle"><RiceBuddy/></div><span className="mobile-buddy-spark">✦</span><span className="buddy-hello">같이 잘 먹자!</span></div></section>;
}
