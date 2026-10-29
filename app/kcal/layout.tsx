import Link from 'next/link';
import './style.css';

export default function KcalLayout({children}: {children: React.ReactNode}) {
 return <div className="kcal-shell">
  <header><Link href="/" className="kcal-brand">끼니플랜.</Link><Link href="/kcal">음식 검색</Link><Link href="/saved-foods">저장한 메뉴</Link></header>
  <main>{children}</main>
  <footer><Link href="/kcal">다른 음식 찾아보기</Link><Link href="/record?from=kcal">내 식사 기록하기</Link><span>© 끼니플랜</span></footer>
 </div>;
}
