'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {Card,LinkButton} from '../components/ui';

export default function DinnerSelection(){
 const pathname=usePathname();const [name,setName]=useState('');
 useEffect(()=>{const value=new URLSearchParams(window.location.search).get('dinner')?.slice(0,60)??'';const frame=requestAnimationFrame(()=>setName(value));return()=>cancelAnimationFrame(frame);},[pathname]);
 if(!name)return null;
 return <Card tone="soft"><p>저녁 실험실에서 고른 한 끼</p><h3>{name}</h3><p>이 화면에서 실제 메뉴와 가격을 확인해 보세요. 실험실의 예시가 자동으로 식단에 저장되지는 않아요.</p><LinkButton href="/another-dinner" variant="ghost">다른 저녁 체험하기</LinkButton></Card>;
}
