'use client';
import {useState} from 'react';
import Link from 'next/link';
import {NearbyRestaurants} from '../nearby-restaurants';
export function NearbyPreview(){
 const [menu,setMenu]=useState('순두부찌개');
 return <main className="nearby-preview"><Link href="/">← 식단으로 돌아가기</Link><p className="nearby-eyebrow">LOCAL PREVIEW · 주변 식당 추천</p><h1>오늘은 동네에서<br/>한 끼 해결해요.</h1><p>추천 메뉴와 비슷한 음식을 파는 식당을 찾아보세요.</p><div className="nearby-preview-menus" role="group" aria-label="미리볼 추천 메뉴">{['순두부찌개','소고기장국 + 오이무침','제육볶음','연어 포케','토마토 파스타'].map(value=><button type="button" key={value} aria-pressed={menu===value} onClick={()=>setMenu(value)}>{value}</button>)}</div><NearbyRestaurants key={menu} menu={menu} embedded/></main>;
}

