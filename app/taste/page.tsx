import type {Metadata} from 'next';
import TasteAtlas from './screen';
import LegacyTasteAtlas from './legacy-screen';
import {parseTaste} from '../../lib/taste-atlas';
export const metadata:Metadata={title:'너, 내 입맛 얼마나 알아? | 끼니플랜',description:'같이 먹은 짬바 테스트. 사진으로 만드는 여섯 문제, 친구는 몇 개나 맞힐까요?',alternates:{canonical:'/taste'},openGraph:{title:'우리 그렇게 같이 먹었는데, 이건 맞히겠지?',description:'친구가 보낸 입맛 도전장. 가입 없이 여섯 문제만 맞혀봐요.',url:'/taste'}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const p=await searchParams;
 if(p.v===undefined&&p.q===undefined&&(parseTaste(p.friend)!==null||parseTaste(p.me)!==null))return <LegacyTasteAtlas friend={parseTaste(p.friend)} initial={parseTaste(p.me)}/>;
 const invalid=(p.v!==undefined&&p.v!=='2')||(p.q!==undefined&&(p.v!=='2'||parseTaste(p.q)===null));
 const target=invalid?null:parseTaste(p.q),initial=invalid?null:parseTaste(p.me),guess=target===null?null:parseTaste(p.guess);
 return <TasteAtlas key={`${target}-${initial}-${guess}`} target={target} initial={initial} initialGuess={guess} invalid={invalid}/>;
}
