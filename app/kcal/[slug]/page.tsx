import Link from 'next/link';
import {notFound} from 'next/navigation';
import {DAILY_VALUE, foodPagePath, getFoodPage, foodComparisonCandidates} from '../../../lib/food-pages';
import {pageMetadata, siteUrl} from '../../../lib/seo';
import {FoodComparison} from './food-comparison';
import {KcalActions} from './kcal-actions';
import {DetailedNutrition} from '../../detailed-nutrition';
import {foodSourceUrl,officialNutritionUrl} from '../../../lib/food-provenance';
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
 const {food, provenance, slug, related, sameBrand} = await load(props);
 const comparisonItems=await foodComparisonCandidates(food);
 const officialUrl=officialNutritionUrl(food.brand);
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
  <aside className="kcal-basis" aria-label="영양정보 기준 안내">
   <strong>{serving}의 영양값이에요 · 한 판·한 조각·한 컵 여부는 미확인</strong>
   <p>아래 ¼·½·1배는 {serving}에 대한 비율이며, 조각 수나 인분 수가 아니에요.</p>
   <p>출처: <a href={foodSourceUrl} target="_blank" rel="noopener noreferrer">{provenance?.matches?provenance.source:'식품영양성분 데이터베이스'}</a><br/>공공 DB 기준일: {provenance?.matches?provenance.sourceDate??'미확인':'미확인'} · 데이터 생성일: {provenance?.matches?provenance.createdDate??'미확인':'미확인'}</p>
   <details><summary>원본 기준량 · 공식 대조 여부</summary>
    {provenance?.matches?<><p>원본 영양 기준: {provenance.basisText??'미확인'}<br/>원본 식품중량: {provenance.weightText??'미제공'}<br/>원본 1회 참고량: {provenance.servingText??'미제공'}</p><p>자료 구분: {provenance.origin??'미확인'}</p></>:<p>표시된 요약 영양값과 일치하는 원본의 기준일을 확인하지 못했어요.</p>}
    <p>공공 DB 기준일은 브랜드가 메뉴를 변경하거나 영양값을 다시 측정한 날짜가 아니에요.</p>
    <p>{food.brand?'브랜드 최신 공식 영양표 대조: 미완료. 도우·크기·온도·옵션이 같은 제품의 최신 표시를 우선 확인해 주세요.':'조리법과 재료, 실제 먹은 양에 따라 달라질 수 있어요.'}</p>
    {officialUrl&&<a href={officialUrl} target="_blank" rel="noopener noreferrer">{food.brand} 공식 메뉴·영양정보 확인 ↗</a>}
   </details>
  </aside>
  <FoodComparison food={food} items={comparisonItems}/>
  <section className="kcal-cta">
   <h2>다음에 먹을까요, 오늘 먹었나요?</h2>
   <p>마음에 들면 다음 메뉴로 저장하고, 이미 먹었다면 먹은 양을 기록해요.</p>
   <KcalActions code={food.code} kcal={food.kcal} amount={food.servingAmount} unit={food.servingUnit} protein={food.protein} sugar={food.sugar}/>
  </section>
  <div className="kcal-grid">{cells.map(([label, v, unit, dv]) => <div key={label} className={`kcal-cell${v !== null && v / dv > .5 ? ' is-high' : ''}`}>
   <small>{label}</small><b>{v === null ? '-' : `${n(v)}${unit}`}</b>
   {v !== null && <><div className="kcal-bar" aria-hidden="true"><i style={{width: `${Math.min(100, v / dv * 100)}%`}}/></div><em>하루 기준치의 {pct(v, dv)}%</em></>}
  </div>)}</div>
  <DetailedNutrition code={food.code} amount={food.servingAmount} unit={food.servingUnit}/>
  {sameBrand.length > 0 && <section className="kcal-box"><h2>{food.brand} 다른 메뉴</h2><ul className="kcal-links">{sameBrand.map((r) => <li key={r.slug}><Link href={foodPagePath(r.slug)}>{r.name}</Link></li>)}</ul></section>}
  {related.length > 0 && <section className="kcal-box"><h2>다른 음식 정보 둘러보기</h2><ul className="kcal-links">{related.map((r) => <li key={r.slug}><Link href={foodPagePath(r.slug)}>{r.name}</Link></li>)}</ul></section>}
  <p className="kcal-note">출처: 식품영양성분 데이터베이스 · Korean Food Composition Database system(K-FCDB). 표시된 기준량의 참고값이며 조리법·식당·양에 따라 달라요. 하루 기준치는 식품 표시용 1일 영양성분 기준치예요.</p>
 </>;
}
