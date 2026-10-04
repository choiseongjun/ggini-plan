import Link from 'next/link';
import {notFound, permanentRedirect} from 'next/navigation';
import {comparePath, foodPagePath, getFoodsBySlugs, parseComparePair} from '../../../../lib/food-pages';
import type {FoodReference} from '../../../../lib/food-reference';
import {pageMetadata, siteUrl} from '../../../../lib/seo';
import {LinkButton} from '../../../components/ui';
import {josa} from '../../../../lib/josa';
export const revalidate = 86400;

type Props = {params: Promise<{pair: string}>};
type Entry = {slug: string; food: FoodReference};
const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
const n = (v: number | null, unit = '') => v === null ? '-' : `${(Math.round(v * 10) / 10).toLocaleString('ko-KR')}${unit}`;

async function load(props: Props): Promise<[Entry, Entry]> {
 const pair = parseComparePair(decode((await props.params).pair));
 if (!pair) notFound();
 const foods = await getFoodsBySlugs(pair);
 if (foods.length !== 2) notFound();
 // B-vs-A로 들어오면 한 주소로 모은다(본문 전송 전에 308).
 const canonical = comparePath(pair[0], pair[1]);
 if (`/kcal/vs/${encodeURIComponent(`${pair[0]}-vs-${pair[1]}`)}` !== canonical) permanentRedirect(canonical);
 return [foods[0], foods[1]];
}

export async function generateMetadata(props: Props) {
 const [a, b] = await load(props);
 return pageMetadata(`${a.food.name} vs ${b.food.name} 칼로리 비교 · 영양성분 | 끼니플랜`,
  `${a.food.name} ${n(a.food.kcal, 'kcal')}, ${b.food.name} ${n(b.food.kcal, 'kcal')}(1인분). 탄수화물·단백질·지방·당류·나트륨을 나란히 비교하고 어느 쪽이 가벼운지 확인하세요. 식약처 식품영양성분 DB 기준.`,
  comparePath(a.slug, b.slug));
}

// 더 나은 쪽과 차이를 한 문장씩.
function verdicts(a: FoodReference, b: FoodReference) {
 const lines: string[] = [];
 if (a.kcal !== null && b.kcal !== null && a.kcal !== b.kcal) {
  const [lo, hi] = a.kcal < b.kcal ? [a, b] : [b, a];
  lines.push(`${josa(lo.name,'이','가')} ${Math.round((hi.kcal ?? 0) - (lo.kcal ?? 0))}kcal 더 가벼워요.`);
 }
 if (a.protein !== null && b.protein !== null && Math.abs(a.protein - b.protein) >= 3) {
  lines.push(`단백질은 ${josa((a.protein > b.protein ? a : b).name,'이','가')} ${n(Math.abs(a.protein - b.protein), 'g')} 더 많아요.`);
 }
 if (a.sodium !== null && b.sodium !== null && Math.abs(a.sodium - b.sodium) >= 200) {
  lines.push(`나트륨은 ${josa((a.sodium < b.sodium ? a : b).name,'이','가')} ${Math.round(Math.abs(a.sodium - b.sodium)).toLocaleString('ko-KR')}mg 적어요.`);
 }
 return lines;
}

const ROWS: [string, 'kcal' | 'carbs' | 'protein' | 'fat' | 'sugar' | 'sodium', string][] = [
 ['열량', 'kcal', 'kcal'], ['탄수화물', 'carbs', 'g'], ['단백질', 'protein', 'g'], ['지방', 'fat', 'g'], ['당류', 'sugar', 'g'], ['나트륨', 'sodium', 'mg'],
];

export default async function ComparePage(props: Props) {
 const [a, b] = await load(props);
 const canonical = comparePath(a.slug, b.slug);
 const lines = verdicts(a.food, b.food);
 const breadcrumb = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
  {'@type': 'ListItem', position: 1, name: '끼니플랜', item: siteUrl},
  {'@type': 'ListItem', position: 2, name: '음식 칼로리', item: siteUrl + '/kcal'},
  {'@type': 'ListItem', position: 3, name: `${a.food.name} vs ${b.food.name}`, item: siteUrl + canonical},
 ]};
 return <>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(breadcrumb).replace(/</g, '\\u003c')}}/>
  <nav className="kcal-crumb" aria-label="현재 위치"><Link href="/">홈</Link> / <Link href="/kcal">음식 칼로리</Link> / 비교</nav>
  <h1>{a.food.name} vs {b.food.name} 칼로리·영양 비교</h1>
  <p className="kcal-sub">1인분 기준 · {a.food.name} {n(a.food.servingAmount, a.food.servingUnit)} · {b.food.name} {n(b.food.servingAmount, b.food.servingUnit)}</p>
  {lines.length > 0 && <section className="kcal-box"><h2>한눈에 보기</h2><ul>{lines.map((t) => <li key={t}>{t}</li>)}</ul></section>}
  <section className="kcal-box"><h2>영양성분 나란히 보기</h2>
   <table className="kcal-vs-table">
    <thead><tr><th scope="col">1인분</th><th scope="col"><Link href={foodPagePath(a.slug)}>{a.food.name}</Link></th><th scope="col"><Link href={foodPagePath(b.slug)}>{b.food.name}</Link></th></tr></thead>
    <tbody>{ROWS.map(([label, key, unit]) => {
     const x = a.food[key], y = b.food[key];
     const better = x === null || y === null || x === y ? null : key === 'protein' ? (x > y ? 'a' : 'b') : (x < y ? 'a' : 'b');
     return <tr key={label}><th scope="row">{label}</th><td className={better === 'a' ? 'is-better' : undefined}>{n(x, unit)}</td><td className={better === 'b' ? 'is-better' : undefined}>{n(y, unit)}</td></tr>;
    })}</tbody>
   </table>
  </section>
  <section className="kcal-cta">
   <h2>오늘은 어느 쪽을 먹었나요?</h2>
   <p>기록하면 오늘 남은 칼로리·단백질에 맞춰 다음 끼니를 골라 드려요.</p>
   <div className="kcal-actions">
    <LinkButton variant="primary" block href={`/record?log=${encodeURIComponent(a.food.code)}`}>{a.food.name} 먹었어요</LinkButton>
    <LinkButton variant="primary" block href={`/record?log=${encodeURIComponent(b.food.code)}`}>{b.food.name} 먹었어요</LinkButton>
    <LinkButton variant="secondary" block href="/?from=kcal">오늘 남은 끼니 추천받기</LinkButton>
   </div>
  </section>
  <p className="kcal-note">출처: 식품의약품안전처 식품영양성분 데이터베이스. 1인분 참고값이며 조리법·식당·양에 따라 달라요. 초록색 칸은 더 가벼운 쪽(단백질은 더 많은 쪽)이에요.</p>
 </>;
}
