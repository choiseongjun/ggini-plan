import Link from 'next/link';
import './section-navigation.css';

const planningPages = [
  ['plan', '/plan', '미리 짜기'],
  ['calendar', '/calendar', '식단 달력'],
] as const;

export function PlanningNavigation({section}: {section: string}) {
  return <nav className="section-navigation planning-navigation" aria-label="식단 메뉴">
    {planningPages.map(([key, href, label]) => <Link key={key} href={href} aria-current={section === key ? 'page' : undefined}>{label}</Link>)}
  </nav>;
}

export function TodayNavigation({section}: {section: string}) {
  return <nav className="section-navigation today-navigation" aria-label="오늘의 메뉴 선택">
    {([['home', '/', '집에서'], ['eat-out', '/eat-out', '외식'], ['convenience', '/convenience', '편의점']] as const).map(([key, href, label]) => <Link key={key} href={href} aria-current={section === key ? 'page' : undefined}>{label}</Link>)}
  </nav>;
}

export function ShoppingNavigation({section, onView}: {section: 'list' | 'products' | 'ingredients'; onView?: (view: 'list' | 'products') => void}) {
  return <nav className="section-navigation shopping-navigation" aria-label="장보기 메뉴">
    {(['list', 'products'] as const).map(view => onView ? <button key={view} type="button" aria-pressed={section === view} onClick={() => onView(view)}>{view === 'list' ? '살 재료' : '상품 찾기'}</button> : <Link key={view} href={`/cart?view=${view}`}>{view === 'list' ? '살 재료' : '상품 찾기'}</Link>)}
    <Link href="/ingredients" aria-current={section === 'ingredients' ? 'page' : undefined}>내 재료</Link>
  </nav>;
}
