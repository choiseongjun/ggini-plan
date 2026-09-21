import Link from "next/link";
import { guides } from "../../lib/guides";
import { pageMetadata } from "../../lib/seo";
export const metadata = pageMetadata("나에게 맞는 식단·영양·식비 가이드 | 끼니플랜", "예산, 목표 칼로리, 영양성분, 식재료와 실제 상품까지. 내 생활에 맞는 식단을 만들기 위한 가이드를 확인해보세요.", "/guides");
export default function Guides() { return <><p className="guide-kicker">내 생활에 맞게 먹는 법</p><h1>나에게 맞는 식단 가이드</h1><p className="guide-lead">얼마를 먹고, 무엇을 고르고, 어떻게 조합할지.<br/>예산과 영양 목표에 맞춰 내 식생활을 하나씩 계획해보세요.</p><p><Link href="/products">실제 상품 가격·영양성분 비교하기 →</Link></p><div className="guide-list">{guides.map((g,i)=><Link key={g.slug} href={"/guides/"+g.slug}><small>0{i+1}</small><h2>{g.title}</h2><p>{g.description}</p><span>읽어보기 →</span></Link>)}</div></>; }
