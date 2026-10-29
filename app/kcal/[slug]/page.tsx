import Link from 'next/link';
import {notFound} from 'next/navigation';
import {DAILY_VALUE, compareCandidates, comparePath, foodPagePath, getFoodPage} from '../../../lib/food-pages';
import {pageMetadata, siteUrl} from '../../../lib/seo';
import {KcalActions} from './kcal-actions';
import {DetailedNutrition} from '../../detailed-nutrition';
import {josa} from '../../../lib/josa';
export const revalidate = 86400;

type Props = {params: Promise<{slug: string}>};
const n = (v: number) => (Math.round(v * 10) / 10).toLocaleString('ko-KR');
const k = (v: number) => Math.round(v).toLocaleString('ko-KR');
const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
const title = (name: string, brand: string | null) => brand ? `${brand} ${name}` : name;

async function load(props: Props) {
 const {slug} = await props.params;
 const page = await getFoodPage(decode(slug));
 if (!page) notFound();
 return page;
}

export async function generateMetadata(props: Props) {
 const {food, slug} = await load(props);
 const name = title(food.name, food.brand), serving = `${n(food.servingAmount)}${food.servingUnit}`;
 const meta = pageMetadata(`${name} 칼로리 ${food.kcal === null ? '' : `${k(food.kcal)}kcal `}· 영양성분 (${serving} 기준) | 끼니플랜`,
  `${name} 기준량 ${serving} 칼로리 ${food.kcal === null ? '미확인' : `${k(food.kcal)}kcal`}, 탄수화물 ${food.carbs ?? '-'}g, 단백질 ${food.protein ?? '-'}g, 지방 ${food.fat ?? '-'}g, 당류 ${food.sugar ?? '-'}g, 나트륨 ${food.sodium ?? '-'}mg. 하루 기준치 대비 비율과 비슷한 음식도 함께 보세요.`,
  foodPagePath(slug));
 // 음식별 카드(opengraph-image)를 공유 미리보기로 쓴다.
 const image = {url: `${siteUrl}${foodPagePath(slug)}/opengraph-image`, width: 1200, height: 630, alt: `${name} 칼로리`};
 return {...meta, openGraph: {...meta.openGraph, images: [image]}, twitter: {...meta.twitter, images: [image]}};
}

export default async function FoodKcalPage(props: Props) {
 const {food, slug, related, sameBrand} = await load(props);
 const compare = food.brand ? [] : await compareCandidates(slug, food.category, food.kcal);
 const name = title(food.name, food.brand), serving = `${n(food.servingAmount)}${food.servingUnit}`;
 const cells: [string, number | null, string, number][] = [
  ['탄수화물', food.carbs, 'g', DAILY_VALUE.carbs], ['단백질', food.protein, 'g', DAILY_VALUE.protein], ['지방', food.fat, 'g', DAILY_VALUE.fat],
  ['당류', food.sugar, 'g', DAILY_VALUE.sugar], ['나트륨', food.sodium, 'mg', DAILY_VALUE.sodium],
 ];
 const pct = (v: number, dv: number) => Math.round(v / dv * 100);
 const breadcrumb = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
  {'@type': 'ListItem', position: 1, name: '끼니플랜', item: siteUrl},
  {'@type': 'ListItem', position: 2, name: '음식 칼로리', item: siteUrl + '/kcal'},
  {'@type': 'ListItem', position: 3, name, item: siteUrl + foodPagePath(slug)},
 ]};
 return <>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(breadcrumb).replace(/</g, '\\u003c')}}/>
  <nav className="kcal-crumb" aria-label="현재 위치"><Link href="/">홈</Link> / <Link href="/kcal">음식 칼로리</Link>{food.category ? ` / ${food.category}` : ''}</nav>
  <h1>{name} 칼로리·영양성분</h1>
  <p className="kcal-sub">영양정보 기준량 {serving}{food.category ? ` · ${food.category}` : ''}</p>
  <div className="kcal-hero"><strong>{food.kcal === null ? '-' : k(food.kcal)}</strong><span>kcal · {serving} 기준</span></div>
  <aside className="kcal-basis" aria-label="영양정보 기준 안내"><strong>한 컵·한 조각의 양인지 확인해 주세요</strong><p>이 값은 {serving} 기준으로, 실제 제품의 중량·용량과 다를 수 있어요.</p><details><summary>자료 출처와 확인할 점</summary><p>식품영양성분 데이터베이스 기준으로 현재 판매 제품과 다를 수 있어요. 브랜드의 최신 영양표시를 우선 확인해 주세요.</p></details></aside>
  <section className="kcal-cta">
   <h2>칼로리만 보고 헤어지기 아쉬운데.</h2>
   <p>이 음식 먹었나요? 먹은 양을 남기고 오늘의 칼로리·단백질 합계도 확인해 보세요.</p>
   <KcalActions code={food.code} kcal={food.kcal} amount={food.servingAmount} unit={food.servingUnit} protein={food.protein} sugar={food.sugar}/>
  </section>
  <div className="kcal-grid">{cells.map(([label, v, unit, dv]) => <div key={label} className={`kcal-cell${v !== null && v / dv > .5 ? ' is-high' : ''}`}>
   <small>{label}</small><b>{v === null ? '-' : `${n(v)}${unit}`}</b>
   {v !== null && <><div className="kcal-bar" aria-hidden="true"><i style={{width: `${Math.min(100, v / dv * 100)}%`}}/></div><em>하루 기준치의 {pct(v, dv)}%</em></>}
  </div>)}</div>
  <DetailedNutrition code={food.code} amount={food.servingAmount} unit={food.servingUnit}/>
  {compare.length > 0 && <section className="kcal-box"><h2>{josa(food.name,'과','와')} 비교해 보기</h2><ul className="kcal-links">{compare.map((r) => <li key={r.slug}><Link href={comparePath(slug, r.slug)}>{food.name} vs {r.name}</Link></li>)}</ul></section>}
  {sameBrand.length > 0 && <section className="kcal-box"><h2>{food.brand} 다른 메뉴</h2><ul className="kcal-links">{sameBrand.map((r) => <li key={r.slug}><Link href={foodPagePath(r.slug)}>{r.name}{r.kcal !== null && <small>{Math.round(r.kcal)}kcal</small>}</Link></li>)}</ul></section>}
  {related.length > 0 && <section className="kcal-box"><h2>비슷한 음식 칼로리</h2><ul className="kcal-links">{related.map((r) => <li key={r.slug}><Link href={foodPagePath(r.slug)}>{r.name}{r.kcal !== null && <small>{Math.round(r.kcal)}kcal</small>}</Link></li>)}</ul></section>}
  <p className="kcal-note">출처: 식품영양성분 데이터베이스 · Korean Food Composition Database system(K-FCDB). 표시된 기준량의 참고값이며 조리법·식당·양에 따라 달라요. 하루 기준치는 식품 표시용 1일 영양성분 기준치예요.</p>
 </>;
}
