import Link from 'next/link';
import SavedFoods from './saved-foods';
import '../kcal/style.css';
export const metadata={title:'다음에 먹을 메뉴 | 끼니플랜',robots:{index:false,follow:false}};
export default function Page(){return <main className="kcal-shell"><header><Link href="/kcal">← 음식 검색</Link><Link href="/record">식사 일기</Link></header><h1>다음에 먹을 메뉴</h1><p>먹기 전에 비교하고 저장해요. 실제로 먹었을 때 식사 기록에 추가하세요.</p><SavedFoods/></main>;}
