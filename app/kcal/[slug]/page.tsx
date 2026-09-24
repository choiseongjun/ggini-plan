import Link from 'next/link';
import {notFound} from 'next/navigation';
import {DAILY_VALUE, foodPagePath, getFoodPage} from '../../../lib/food-pages';
import {pageMetadata, siteUrl} from '../../../lib/seo';
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
 return pageMetadata(`${name} 칼로리 ${food.kcal === null ? '' : `${k(food.kcal)}kcal `}· 영양성분 (1인분 ${serving}) | 끼니플랜`,
  `${name} 1인분(${serving}) 칼로리 ${food.kcal === null ? '미확인' : `${k(food.kcal)}kcal`}, 탄수화물 ${food.carbs ?? '-'}g, 단백질 ${food.protein ?? '-'}g, 지방 ${food.fat ?? '-'}g, 당류 ${food.sugar ?? '-'}g, 나트륨 ${food.sodium ?? '-'}mg. 하루 기준치 대비 비율과 비슷한 음식도 함께 보세요.`,
  foodPagePath(slug));
}

export default async function FoodKcalPage(props: Props) {
 const {food, slug, related, sameBrand} = await load(props);
 const name = title(food.name, food.brand), serving = `${n(food.servingAmount)}${food.servingUnit}`;
 const cells: [string, number | null, string, number][] = [
  ['탄수화물', food.carbs, 'g', DAILY_VALUE.carbs], ['단백질', food.protein, 'g', DAILY_VALUE.protein], ['지방', food.fat, 'g', DAILY_VALUE.fat],
  ['당류', food.sugar, 'g', DAILY_VALUE.sugar], ['나트륨', food.sodium, 'mg', DAILY_VALUE.sodium],
 ];
 const pct = (v: number, dv: number) => Math.round(v / dv * 100);
 // 걷기(보통 속도, 체중 60kg 기준 분당 약 4kcal)로 소모하려면.
 const walk = food.kcal ? Math.round(food.kcal / 4) : null;
 const notes = [
  food.kcal !== null && `하루 기준 열량 2,000kcal의 ${pct(food.kcal, DAILY_VALUE.kcal)}%예요.`,
  food.sodium !== null && food.sodium >= 1000 && `나트륨이 하루 기준치(2,000mg)의 ${pct(food.sodium, DAILY_VALUE.sodium)}%로 많은 편이에요. 국물은 절반만 드시면 줄일 수 있어요.`,
  food.sugar !== null && food.sugar >= 25 && `당류가 ${n(food.sugar)}g이에요. 하루 당류는 50g 안쪽(총열량의 10%)을 권해요.`,
  food.protein !== null && food.protein >= 25 && `단백질이 ${n(food.protein)}g으로 한 끼 단백질을 충분히 채워요.`,
  walk !== null && `걷기로 소모하려면 약 ${walk.toLocaleString('ko-KR')}분이 걸려요(체중 60kg, 보통 속도 기준).`,
 ].filter(Boolean) as string[];
 const breadcrumb = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
  {'@type': 'ListItem', position: 1, name: '끼니플랜', item: siteUrl},
  {'@type': 'ListItem', position: 2, name: '음식 칼로리', item: siteUrl + '/kcal'},
  {'@type': 'ListItem', position: 3, name, item: siteUrl + foodPagePath(slug)},
 ]};
 return <>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(breadcrumb).replace(/</g, '\\u003c')}}/>
  <nav className="kcal-crumb" aria-label="현재 위치"><Link href="/">홈</Link> / <Link href="/kcal">음식 칼로리</Link>{food.category ? ` / ${food.category}` : ''}</nav>
  <h1>{name} 칼로리·영양성분</h1>
  <p className="kcal-sub">1인분 {serving} 기준{food.category ? ` · ${food.category}` : ''}</p>
  <div className="kcal-hero"><strong>{food.kcal === null ? '-' : k(food.kcal)}</strong><span>kcal · 1인분 {serving}</span></div>
  <div className="kcal-grid">{cells.map(([label, v, unit, dv]) => <div key={label} className={`kcal-cell${v !== null && v / dv > .5 ? ' is-high' : ''}`}>
   <small>{label}</small><b>{v === null ? '-' : `${n(v)}${unit}`}</b>
   {v !== null && <><div className="kcal-bar" aria-hidden="true"><i style={{width: `${Math.min(100, v / dv * 100)}%`}}/></div><em>하루 기준치의 {pct(v, dv)}%</em></>}
  </div>)}</div>
  {notes.length > 0 && <section className="kcal-box"><h2>한눈에 보기</h2><ul>{notes.map((t) => <li key={t}>{t}</li>)}</ul></section>}
  <section className="kcal-cta">
   <h2>오늘 먹은 것까지 따져서 골라 드려요</h2>
   <p>{name}, 지금 먹어도 괜찮을까요? 끼니플랜은 오늘 먹은 칼로리·나트륨과 내 목표를 보고 지금 먹기 좋은 메뉴를 골라 주고, 먹은 걸 한 번에 기록해 줘요.</p>
   <Link href="/?from=kcal">지금 뭐 먹지? 골라 보기</Link>
  </section>
  {sameBrand.length > 0 && <section className="kcal-box"><h2>{food.brand} 다른 메뉴</h2><ul className="kcal-links">{sameBrand.map((r) => <li key={r.slug}><Link href={foodPagePath(r.slug)}>{r.name}{r.kcal !== null && <small>{Math.round(r.kcal)}kcal</small>}</Link></li>)}</ul></section>}
  {related.length > 0 && <section className="kcal-box"><h2>비슷한 음식 칼로리</h2><ul className="kcal-links">{related.map((r) => <li key={r.slug}><Link href={foodPagePath(r.slug)}>{r.name}{r.kcal !== null && <small>{Math.round(r.kcal)}kcal</small>}</Link></li>)}</ul></section>}
  <p className="kcal-note">출처: 식품의약품안전처 식품영양성분 데이터베이스(전국통합식품영양성분정보). 1인분 참고값이며 조리법·식당·양에 따라 달라요. 하루 기준치는 식품 표시용 1일 영양성분 기준치예요.</p>
 </>;
}
