import Link from "next/link";
import { guides } from "../../lib/guides";
import { pageMetadata } from "../../lib/seo";
export const metadata = pageMetadata("내 식사에서 건강을 찾는 법 | 끼니플랜", "먹은 것과 먹을 것을 분석해 내게 필요한 영양과 음식을 찾는 법. 목표 칼로리, 영양성분, 식재료와 실제 상품까지 내 식생활 가이드를 확인해보세요.", "/guides");
export default function Guides() { return <><p className="guide-kicker">내 식사에서 건강을 찾다</p><h1>나에게 맞는 건강한 식생활 가이드</h1><p className="guide-lead">무엇을 먹었고, 무엇이 부족한지.<br/>내게 필요한 영양과 음식을 하나씩 찾아가요.</p><p><Link href="/products">실제 상품 가격·영양성분 비교하기 →</Link></p><div className="guide-list">{guides.map((g,i)=><Link key={g.slug} href={"/guides/"+g.slug}><small>0{i+1}</small><h2>{g.title}</h2><p>{g.description}</p><span>읽어보기 →</span></Link>)}</div></>; }
