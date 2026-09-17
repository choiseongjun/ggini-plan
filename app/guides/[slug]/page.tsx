import Link from "next/link";
import { notFound } from "next/navigation";
import { guides } from "../../../lib/guides";
import { pageMetadata, siteUrl } from "../../../lib/seo";
export const dynamicParams = false;
export function generateStaticParams() { return guides.map(g => ({ slug: g.slug })); }
export async function generateMetadata({params}: {params: Promise<{slug:string}>}) {
  const {slug}=await params; const guide=guides.find(g=>g.slug===slug); if(!guide) notFound();
  return pageMetadata(guide.title+" | 끼니플랜",guide.description,"/guides/"+slug);
}
export default async function Guide({params}: {params:Promise<{slug:string}>}) {
  const {slug}=await params; const guide=guides.find(g=>g.slug===slug); if(!guide) notFound();
  const breadcrumb = {"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"끼니플랜",item:siteUrl},{"@type":"ListItem",position:2,name:"자취 식생활 가이드",item:siteUrl+"/guides"},{"@type":"ListItem",position:3,name:guide.title,item:siteUrl+"/guides/"+slug}]};
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumb).replace(/</g,"\\u003c")}}/><nav aria-label="현재 위치"><Link href="/">홈</Link> / <Link href="/guides">자취 가이드</Link></nav><article><p className="guide-kicker">끼니플랜 생활 노트</p><h1>{guide.title}</h1><p className="guide-lead">{guide.description}</p>{guide.sections.map(s=><section key={s.title}><h2>{s.title}</h2><p>{s.text}</p></section>)}</article><aside className="guide-cta"><h2>이제 내 일주일을 계획해 볼까요?</h2><p>식비 예산부터 내 생활에 맞는 식단까지.</p><Link href="/">끼니플랜 시작하기 →</Link></aside><p><Link href="/products">장보기 전 상품 가격·영양성분 비교하기 →</Link></p><h2>함께 읽어보세요</h2><ul>{guides.filter(g=>g.slug!==slug).map(g=><li key={g.slug}><Link href={"/guides/"+g.slug}>{g.title}</Link></li>)}</ul></>;
}
