import {RiceBuddy} from './rice-buddy';
import './mobile-buddy.css';

export function MobileBuddy(){
 return <section className="mobile-buddy" aria-label="밥 친구 끼니랑"><div className="mobile-buddy-scene" aria-hidden="true"><div className="mobile-buddy-circle"><RiceBuddy/></div><span className="mobile-buddy-broccoli">🥦</span><span className="mobile-buddy-tomato">🍅</span><span className="mobile-buddy-spark">✦</span></div><div className="mobile-buddy-copy"><span className="mobile-buddy-sticker">잘 먹고 🥄</span><span className="mobile-buddy-sticker">조금씩 아끼고 🌱</span><p>밥 친구 끼니랑,<br/>매일 한 끼씩.</p></div></section>;
}
