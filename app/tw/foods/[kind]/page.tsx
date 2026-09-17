import Link from 'next/link';
import {notFound} from 'next/navigation';
import {isTaiwanFoodKind,taiwanFoodGuides} from '../../../../lib/taiwan-food-types';
import {twFoodPath} from '../../../../lib/taiwan-comparison';
import {safeJson} from '../../../../lib/taiwan-catalog';
import {siteUrl} from '../../../../lib/seo';
import CatalogGrid,{twListingData,twListingMetadata,type TwProductSearch} from '../../products/catalog-grid';
type Props={params:Promise<{kind:string}>;searchParams:Promise<TwProductSearch>};
export const revalidate=3600;
async function selected(props:Props){const {kind}=await props.params;if(!isTaiwanFoodKind(kind))notFound();const search=await props.searchParams;const data=await twListingData(search,undefined,kind);if(!data.all.length)notFound();return {kind,search,data,guide:taiwanFoodGuides[kind]};}
export async function generateMetadata(props:Props){const {kind,search,guide}=await selected(props);return twListingMetadata(guide[0]+'價格・營養標示・包裝規格比較',guide[1]+' 查看販售價格與原文營養標示。',twFoodPath(kind),search);}
export default async function Page(props:Props){const {kind,search,data,guide}=await selected(props);const breadcrumb={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'食品比較',item:siteUrl+'/tw/products'},{'@type':'ListItem',position:2,name:guide[0],item:siteUrl+twFoodPath(kind)}]};return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJson(breadcrumb)}}/><nav aria-label="目前位置"><Link href="/tw/products">所有商品</Link> / {guide[0]}</nav><section className="products-intro"><span className="products-kicker">{data.all.length} 件登錄商品</span><h1>{guide[0]}價格・營養比較</h1><p>{guide[1]}</p></section><CatalogGrid foodKind={kind} search={search}/><section className="products-note"><h2>{guide[0]}選購前先確認</h2><p>{guide[2]}</p><p>食品分類依商品名稱與原賣場分類整理；實際原料、規格與保存方式以收到的包裝為準。</p><Link href="/tw">依預算安排一週餐點 →</Link></section></>;}
