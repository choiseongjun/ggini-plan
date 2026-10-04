import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {AppShell,Brand} from '../../app-shell';
import {pantrySourceProducts} from '../../../lib/pantry-source-recommendations';
import '../../pantry-home.css';
type Props={params:Promise<{id:string}>};
export function generateStaticParams(){return pantrySourceProducts().map(p=>({id:p.id}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {id}=await params;const p=pantrySourceProducts().find(p=>p.id===id);if(!p)return {title:'메뉴를 찾지 못했어요'};
 return {title:`${p.name} 재료와 만드는 법 | 끼니플랜`,description:`${p.name}에 필요한 재료와 분량, 조리 순서를 확인하세요. ${p.sourceRecipe!.video.channel}의 원문 레시피를 기준으로 안내합니다.`,alternates:{canonical:`/recipes/${id}`},openGraph:{title:`오늘은 ${p.name} 어때요?`,description:'재료와 만드는 법을 확인하고 내 주방에서 이어서 만들어보세요.'}};
}
export default async function Recipe({params}:Props){
 const {id}=await params;const p=pantrySourceProducts().find(p=>p.id===id);if(!p)notFound();const source=p.sourceRecipe!;
 return <AppShell><div className="app-content"><article className="pantry-home pantry-public-recipe"><Brand/><p><Link href="/recipes">← 메뉴 둘러보기</Link></p><h1>{p.name}</h1><p>{source.servingLabel}. 재료와 만드는 법은 같은 영상 설명란 기준이에요.</p><Link className="pantry-public-cta" href={`/?recipe=${encodeURIComponent(id)}`}>이 메뉴로 요리 시작 →</Link><p><Link href="/">내 재료로 다른 메뉴 찾기</Link></p><section className="pantry-cooking-guide"><h2>재료와 분량</h2><ul>{source.ingredients.map((i,index)=><li key={index}>{i.label}{i.optional?' · 선택':''}</li>)}</ul><h2>만드는 법</h2><ol>{source.steps.map((step,index)=><li key={index}>{step}</li>)}</ol></section><p>출처: <a href={source.video.url} target="_blank" rel="noopener noreferrer">{source.video.channel} · 원본 영상 보기 ↗</a></p><p className="pantry-muted">원문 분량을 유지했어요. 필요한 양과 포장 재료의 표시를 확인해 주세요.</p></article></div></AppShell>;
}
