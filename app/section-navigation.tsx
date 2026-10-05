import Link from 'next/link';
import './section-navigation.css';

const planningPages = [
  ['plan', '/plan', '미리 짜기'],
  ['ingredients', '/ingredients', '내 재료'],
  ['calendar', '/calendar', '달력'],
  ['eat-out', '/eat-out', '외식'],
] as const;

export function PlanningNavigation({section}: {section: string}) {
  return <nav className="section-navigation" aria-label="식단 메뉴">
    {planningPages.map(([key, href, label]) => <Link key={key} href={href} aria-current={section === key ? 'page' : undefined}>{label}</Link>)}
  </nav>;
}
