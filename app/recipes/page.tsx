import Link from 'next/link';
import type {Metadata} from 'next';
import {AppShell,Brand} from '../app-shell';
import {pantrySourceProducts} from '../../lib/pantry-source-recommendations';
import '../pantry-home.css';
export const metadata:Metadata={title:'있는 재료로 만드는 한 끼 | 끼니플랜',description:'계란·두부·김치로 만들 메뉴를 찾아보세요. 같은 출처의 재료·분량·조리법을 함께 확인할 수 있어요.',alternates:{canonical:'/recipes'}};
export default function Recipes(){
 const products=pantrySourceProducts();
 const groups=[{name:'계란으로 만드는 한 끼',test:/달걀|계란/},{name:'두부·김치가 남았을 때',test:/두부|김치/},{name:'감자로 만드는 메뉴',test:/감자/}];
 return <AppShell><div className="app-content"><div className="pantry-home"><Brand/><h1>있는 재료로 만드는 한 끼</h1><p>메뉴를 고르면 필요한 재료와 만드는 법을 바로 볼 수 있어요.</p><Link className="pantry-public-cta" href="/">내 재료로 추천받기 →</Link>
 {groups.map(g=><section key={g.name}><h2>{g.name}</h2><div className="pantry-discovery-grid">{products.filter(p=>g.test.test(p.name)).map(p=><article key={p.id}><Link href={`/recipes/${p.id}`}>{p.name}</Link><small>{p.sourceRecipe!.servingLabel}</small></article>)}</div></section>)}
 <h2>모든 메뉴</h2><div className="pantry-discovery-grid">{products.map(p=><article key={p.id}><Link href={`/recipes/${p.id}`}>{p.name}</Link></article>)}</div></div></div></AppShell>;
}
