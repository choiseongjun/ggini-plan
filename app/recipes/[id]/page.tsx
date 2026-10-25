import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {AppShell,Brand} from '../../app-shell';
import {pantrySourceProducts} from '../../../lib/pantry-source-recommendations';
import {dailyMenuCatalogue} from '../../../lib/daily-menu';
import '../../pantry-home.css';
type Props={params:Promise<{id:string}>};
function findRecipe(id:string){
 const pantry=pantrySourceProducts().find(p=>p.id===id);
 if(pantry)return {name:pantry.name,source:pantry.sourceRecipe!,pantry:true};
 const daily=dailyMenuCatalogue.find(p=>p.id===id);
 return daily?{name:daily.name,source:daily,pantry:false}:null;
}
export function generateStaticParams(){return [...new Set([...pantrySourceProducts(),...dailyMenuCatalogue].map(p=>p.id))].map(id=>({id}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {id}=await params;const p=findRecipe(id);if(!p)return {title:'메뉴를 찾지 못했어요'};
 return {title:`${p.name} 레시피 | 끼니플랜`,description:`${p.name}의 주요 재료를 살펴보고 ${p.source.video.channel}의 원본 레시피를 확인하세요.`,alternates:{canonical:`/recipes/${id}`},openGraph:{title:`오늘은 ${p.name} 어때요?`,description:'주요 재료와 원본 레시피를 확인해 보세요.'}};
}
export default async function Recipe({params}:Props){
 const {id}=await params;const p=findRecipe(id);if(!p)notFound();const source=p.source;
 if(!p.pantry)return <AppShell><div className="app-content"><article className="pantry-home pantry-public-recipe"><Brand/><p><Link href="/">← 오늘의 끼니 3선</Link></p><h1>{p.name}</h1><p>영상 출처 · {source.video.channel}</p><p>{source.servingLabel}</p><section className="pantry-cooking-guide"><h2>주요 재료</h2><ul>{source.ingredients.map((item,index)=><li key={index}>{item.label}</li>)}</ul></section><a className="pantry-public-cta" href={source.video.url} target="_blank" rel="noopener noreferrer">원본 영상에서 만드는 법 보기 ↗</a></article></div></AppShell>;
 return <AppShell><div className="app-content"><article className="pantry-home pantry-public-recipe"><Brand/><p><Link href="/recipes">← 메뉴 둘러보기</Link></p><h1>{p.name}</h1><p>{source.servingLabel}. 재료와 만드는 법은 같은 영상 설명란 기준이에요.</p><Link className="pantry-public-cta" href={`/?recipe=${encodeURIComponent(id)}`}>이 메뉴로 요리 시작 →</Link><p><Link href="/">내 재료로 다른 메뉴 찾기</Link></p><section className="pantry-cooking-guide"><h2>재료와 분량</h2><ul>{source.ingredients.map((i,index)=><li key={index}>{i.label}{i.optional?' · 선택':''}</li>)}</ul><h2>만드는 법</h2><ol>{source.steps.map((step,index)=><li key={index}>{step}</li>)}</ol></section><p>출처: <a href={source.video.url} target="_blank" rel="noopener noreferrer">{source.video.channel} · 원본 영상 보기 ↗</a></p><p className="pantry-muted">원문 분량을 유지했어요. 필요한 양과 포장 재료의 표시를 확인해 주세요.</p></article></div></AppShell>;
}
