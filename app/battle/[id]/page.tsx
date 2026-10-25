import type {Metadata} from 'next';
import {BattleView} from '../view';
import {readBattle} from '../../../lib/dinner-battle-server';
import {validBattleId} from '../../../lib/dinner-battle';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
 const {id}=await params;
 const battle=validBattleId(id)?await readBattle(id,'').catch(()=>null):null;
 const title=battle?`${battle.menuA} vs ${battle.menuB} · 내 한 끼를 골라줘`:'내 한 끼를 골라줘 | 끼니플랜';
 const description='두 메뉴 중 하나에 투표해 주세요. 가입 없이 참여할 수 있어요!';
 return {title,description,robots:{index:false,follow:false},alternates:{canonical:null},openGraph:{title,description,url:`/battle/${id}`,type:'website'}};
}
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <BattleView id={id}/>;}
