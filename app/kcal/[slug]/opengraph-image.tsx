import {ImageResponse} from 'next/og';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {getFoodPage} from '../../../lib/food-pages';

// 카카오톡·SNS에 칼로리 페이지 링크를 붙였을 때 보이는 카드: 음식 이름과 칼로리를 한눈에.
export const alt = '음식 칼로리·영양성분 | 끼니플랜';
export const size = {width: 1200, height: 630};
export const contentType = 'image/png';
export const revalidate = 86400;

const font = readFile(join(process.cwd(), 'public/fonts/Jua-Regular.ttf'));
const decode = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
const n = (v: number | null, unit: string) => v === null ? '-' : `${Math.round(v * 10) / 10}${unit}`;

export default async function Image({params}: {params: Promise<{slug: string}>}) {
 const page = await getFoodPage(decode((await params).slug));
 const food = page?.food;
 const name = food ? (food.brand ? `${food.brand} ${food.name}` : food.name) : '음식 칼로리';
 const macros: [string, string][] = food ? [['탄수화물', n(food.carbs, 'g')], ['단백질', n(food.protein, 'g')], ['지방', n(food.fat, 'g')], ['나트륨', n(food.sodium, 'mg')]] : [];
 return new ImageResponse(
  <div style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', background: '#f3f6ed', color: '#33402c', fontFamily: 'Jua'}}>
   <div style={{display: 'flex', alignItems: 'center', fontSize: 34, color: '#526c47'}}>끼니플랜 · 음식 칼로리</div>
   <div style={{display: 'flex', flexDirection: 'column'}}>
    <div style={{display: 'flex', fontSize: name.length > 14 ? 64 : 84, lineHeight: 1.15}}>{name}</div>
    {food && <div style={{display: 'flex', alignItems: 'baseline', marginTop: 18}}>
     <span style={{fontSize: 120, color: '#526c47'}}>{food.kcal === null ? '-' : Math.round(food.kcal)}</span>
     <span style={{fontSize: 44, marginLeft: 14, color: '#5f6b55'}}>kcal · 1인분 {Math.round(food.servingAmount)}{food.servingUnit}</span>
    </div>}
   </div>
   <div style={{display: 'flex', gap: 20}}>
    {macros.map(([label, value]) => <div key={label} style={{display: 'flex', flexDirection: 'column', padding: '16px 24px', borderRadius: 20, background: '#fffdf7', border: '2px solid #e1e5d9'}}>
     <span style={{fontSize: 26, color: '#5f6b55'}}>{label}</span><span style={{fontSize: 40}}>{value}</span>
    </div>)}
   </div>
  </div>,
  {...size, fonts: [{name: 'Jua', data: await font, style: 'normal', weight: 400}]},
 );
}
