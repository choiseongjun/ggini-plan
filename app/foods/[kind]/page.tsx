import Link from 'next/link';
import {notFound} from 'next/navigation';
import {isFoodType,foodTypes} from '../../../lib/catalog-food-types';
import {foodComparisonGuides} from '../../../lib/food-comparison-guides';
import {ProductListing,listingData,listingMetadata,type ProductSearch} from '../../products/listing';
import {foodPath,safeStructuredJson} from '../../../lib/product-comparison';
import {siteUrl} from '../../../lib/seo';
export const revalidate=3600;
type Props={params:Promise<{kind:string}>;searchParams:Promise<ProductSearch>};
async function resolve(props:Props){const {kind}=await props.params;if(!isFoodType(kind))notFound();const search=await props.searchParams;const data=await listingData(search,kind);if(!data.all.length)notFound();return {kind,search,data,guide:foodComparisonGuides[kind]};}
export async function generateMetadata(props:Props){const {kind,search,guide}=await resolve(props);return listingMetadata(guide[0],guide[1]+' 판매 구성, 단위 가격과 영양정보 출처를 함께 비교하세요.',foodPath(kind),search);}
export default async function FoodComparison(props:Props){const {kind,search,guide,data}=await resolve(props);const breadcrumb={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'상품 비교',item:siteUrl+'/products'},{'@type':'ListItem',position:2,name:foodTypes[kind],item:siteUrl+foodPath(kind)}]};return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeStructuredJson(breadcrumb)}}/><nav aria-label="현재 위치"><Link href="/products">전체 상품</Link> / {foodTypes[kind]}</nav><section className="products-intro"><span className="products-kicker">{data.all.length}개 등록 상품에서 골라요</span><h1>{guide[0]}</h1><p>{guide[1]}</p></section><ProductListing base={foodPath(kind)} search={search} foodType={kind}/><section className="products-note"><h2>{foodTypes[kind]} 구매 전에 확인하세요</h2><p>{guide[2]}</p><p>1개당 가격은 한 끼 가격과 다를 수 있어요. 영양표의 총내용량과 먹을 분량을 먼저 확인하세요.</p><Link href="/guides/grocery-list-for-one">1인 가구 장보기 양 정하기 →</Link></section></>;}
