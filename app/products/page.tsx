import Link from 'next/link';
import {ProductListing,listingData,listingMetadata,type ProductSearch} from './listing';
export const revalidate=3600;
const title='식품 가격·영양성분 비교';
const description='닭가슴살, 냉동볶음밥, 도시락, 두부 등 한국 판매 상품의 가격·구성·영양성분을 비교하세요. 최대 4개 상품을 골라 원문 출처와 함께 확인할 수 있어요.';
type Props={searchParams:Promise<ProductSearch>};
export async function generateMetadata({searchParams}:Props){const search=await searchParams;await listingData(search);return listingMetadata(title,description,'/products',search);}
export default async function Products({searchParams}:Props){const search=await searchParams;return <><section className="products-intro"><span className="products-kicker">장보기 전에, 한눈에</span><h1>{title}</h1><p>{description}</p><div className="products-intro-links"><Link href="/foods/chicken_breast">닭가슴살 비교 →</Link><Link href="/foods/fried_rice">냉동볶음밥 비교 →</Link><Link href="/foods/lunch_box">도시락 비교 →</Link></div></section><ProductListing base="/products" search={search}/><section className="products-note"><h2>내 예산에 맞게 고르려면</h2><p>판매 묶음의 전체 가격을 먼저 확인하고, 실제 먹을 양과 영양표 기준을 비교하세요. 등록된 상품 안에서 비교하며 실시간 최저가나 판매 순위를 뜻하지 않아요.</p><Link href="/guides/weekly-food-budget">일주일 식비 예산 정하기 →</Link></section></>;}
