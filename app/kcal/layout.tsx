import Link from 'next/link';
import './style.css';

export default function KcalLayout({children}: {children: React.ReactNode}) {
 return <div className="kcal-shell">
  <header><Link href="/" className="kcal-brand">끼니플랜.</Link><Link href="/kcal">음식 칼로리 검색</Link></header>
  <main>{children}</main>
  <footer><Link href="/kcal">음식 칼로리·영양성분</Link><Link href="/">내 식단 만들기</Link><span>© 끼니플랜</span></footer>
 </div>;
}
