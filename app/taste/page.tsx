import type {Metadata} from 'next';
import TasteAtlas from './screen';
import {parseTaste} from '../../lib/taste-atlas';
export const metadata:Metadata={title:'여섯 입으로 찾는 내 취향 | 끼니플랜 입맛 도감',description:'입력 없이 음식 사진 여섯 장. 오늘 당기는 메뉴를 고르고 친구와 입맛을 맞춰 봐요.',alternates:{canonical:'/taste'},openGraph:{title:'우리, 입맛도 통할까?',description:'음식 사진 여섯 장으로 찾는 우리 둘의 한 끼.',url:'/taste'}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const p=await searchParams;return <TasteAtlas friend={parseTaste(p.friend)} initial={parseTaste(p.me)}/>;}
