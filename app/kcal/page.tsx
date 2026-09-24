import Link from 'next/link';
import {foodPagePath, popularFoods, searchFoodPages} from '../../lib/food-pages';
import {pageMetadata} from '../../lib/seo';

type Props = {searchParams: Promise<{q?: string}>};
export const metadata = pageMetadata('음식 칼로리·영양성분 검색 | 끼니플랜', '순대국밥, 짜장면, 카페라떼까지 음식 1만 6천여 개의 1인분 칼로리와 탄수화물·단백질·지방·당류·나트륨을 찾아보세요.', '/kcal');

export default async function KcalIndex(props: Props) {
 const q = ((await props.searchParams).q ?? '').slice(0, 40);
 const [popular, results] = await Promise.all([popularFoods(), q ? searchFoodPages(q) : Promise.resolve([])]);
 return <>
  <h1>음식 칼로리·영양성분</h1>
  <p className="kcal-sub">음식 1만 6천여 개의 1인분 칼로리와 영양성분을 찾아보세요.</p>
  <form className="kcal-search" action="/kcal"><input name="q" defaultValue={q} placeholder="예: 순대국밥, 스타벅스 라떼" aria-label="음식 이름"/><button type="submit">찾기</button></form>
  {q && <section className="kcal-box"><h2>‘{q}’ 검색 결과 {results.length}개</h2>
   {results.length ? <ul className="kcal-links">{results.map((r) => <li key={r.slug}><Link href={foodPagePath(r.slug)}>{r.brand ? `${r.brand} ` : ''}{r.name}{r.kcal !== null && <small>{Math.round(r.kcal)}kcal</small>}</Link></li>)}</ul> : <p>찾는 음식이 없어요. 다른 이름으로 검색해 보세요.</p>}
  </section>}
  <section className="kcal-box"><h2>많이 찾는 음식</h2><ul className="kcal-links">{popular.map((r) => <li key={r.slug}><Link href={foodPagePath(r.slug)}>{r.name}{r.kcal !== null && <small>{Math.round(r.kcal)}kcal</small>}</Link></li>)}</ul></section>
  <section className="kcal-cta"><h2>오늘 먹은 걸로 다음 끼니까지</h2><p>먹은 걸 기록하면 남은 칼로리·나트륨에 맞춰 지금 먹기 좋은 메뉴를 골라 드려요.</p><Link href="/?from=kcal">지금 뭐 먹지? 골라 보기</Link></section>
 </>;
}
