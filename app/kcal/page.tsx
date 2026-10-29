import Link from 'next/link';
import {foodPagePath, popularFoods, searchFoodPages} from '../../lib/food-pages';
import {pageMetadata} from '../../lib/seo';

type Props = {searchParams: Promise<{q?: string}>};
export const metadata = pageMetadata('음식 칼로리·영양성분 검색 | 끼니플랜', '순대국밥, 짜장면, 카페라떼까지 음식 1만 6천여 개의 표시 기준량의 칼로리와 탄수화물·단백질·지방·당류·나트륨을 찾아보세요.', '/kcal');

export default async function KcalIndex(props: Props) {
 const q = ((await props.searchParams).q ?? '').slice(0, 40);
 const [popular, results] = await Promise.all([popularFoods(), q ? searchFoodPages(q) : Promise.resolve([])]);
 return <>
  <h1>음식 칼로리·영양성분</h1>
  <p className="kcal-sub">음식 1만 6천여 개의 표시 기준량의 칼로리와 영양성분을 찾아보세요.</p>
  <form className="kcal-search" action="/kcal"><input name="q" defaultValue={q} placeholder="예: 순대국밥, 스타벅스 라떼" aria-label="음식 이름"/><button type="submit">찾기</button></form>
  {q && <section className="kcal-box"><h2>‘{q}’ 검색 결과 {results.length}개</h2>
   {results.length ? <ul className="kcal-links">{results.map((r) => <li key={r.slug}><Link href={foodPagePath(r.slug)}>{r.brand ? `${r.brand} ` : ''}{r.name}{r.kcal !== null && <small>{Math.round(r.kcal)}kcal</small>}</Link></li>)}</ul> : <p>찾는 음식이 없어요. 다른 이름으로 검색해 보세요.</p>}
  </section>}
  <p><Link href="/submissions?kind=food">찾는 음식이 없나요? 등록 요청하고 처리 상태 확인하기 →</Link></p>
  <section className="kcal-box"><h2>많이 찾는 음식</h2><ul className="kcal-links">{popular.map((r) => <li key={r.slug}><Link href={foodPagePath(r.slug)}>{r.name}{r.kcal !== null && <small>{Math.round(r.kcal)}kcal</small>}</Link></li>)}</ul></section>
  <section className="kcal-cta"><h2>찾아본 음식, 오늘 식사로 남겨 보세요</h2><p>음식과 먹은 양을 확인하고 기록해요. 자주 먹는 한 끼는 다음에 다시 불러올 수 있어요.</p><Link href="/record?from=kcal">오늘 먹은 한 끼 기록하기</Link></section>
 </>;
}
