import Link from 'next/link';
import Image from 'next/image';
import {notFound} from 'next/navigation';
import {getKoreanProducts} from '../../../lib/korean-products';
import {foodTypes} from '../../../lib/catalog-food-types';
import {catalogCategories} from '../../../lib/catalog';
import {pageMetadata,siteUrl} from '../../../lib/seo';
import {comparableNutrition,comparablePrice,comparisonWon,foodPath,nutritionDisplay,productPath,safeStructuredJson} from '../../../lib/product-comparison';
import {allergenOptions,allergyStatuses} from '../../../lib/catalog-allergy';
export const revalidate=3600;
type Props={params:Promise<{id:string}>};
async function product(props:Props){const {id}=await props.params;const p=(await getKoreanProducts()).find(p=>p.id===id);if(!p)notFound();return p;}
export async function generateMetadata(props:Props){const p=await product(props);return pageMetadata(`${p.name} 가격·영양성분·구성 비교 | 끼니플랜`,`${p.name}의 등록 판매가 ${comparisonWon(p.price)}, ${p.detail}. 영양성분 기준량, 가격 확인일과 실제 판매처를 확인하고 비슷한 상품과 비교하세요.`,productPath(p.id));}
export default async function Product(props:Props){
 const p=await product(props),n=comparableNutrition(p),price=comparablePrice(p);
 const sourced=Boolean(p.nutritionSourceUrl||p.nutritionPhotoUrl),label=p.foodType?foodTypes[p.foodType]:catalogCategories[p.category];
 const related=(await getKoreanProducts()).filter(x=>x.id!==p.id&&(p.foodType?x.foodType===p.foodType:x.category===p.category)).slice(0,4);
 const breadcrumb={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'상품 비교',item:siteUrl+'/products'},...(p.foodType?[{'@type':'ListItem',position:2,name:label,item:siteUrl+foodPath(p.foodType)}]:[]),{'@type':'ListItem',position:p.foodType?3:2,name:p.name,item:siteUrl+productPath(p.id)}]};
 const structured={'@context':'https://schema.org','@type':'Product',name:p.name,description:p.detail,sku:p.id,...(p.productImageUrl?{image:p.productImageUrl}:{}),offers:{'@type':'Offer',url:p.productUrl,priceCurrency:'KRW',price:p.price}};
 return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeStructuredJson(breadcrumb)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeStructuredJson(structured)}}/>
  <nav aria-label="현재 위치"><Link href="/products">상품 비교</Link>{p.foodType&&<> / <Link href={foodPath(p.foodType)}>{label}</Link></>}</nav>
  <section className="product-detail-hero">{p.productImageUrl?<Image unoptimized src={p.productImageUrl} alt={p.name} width={420} height={320}/>:<span className="product-image-placeholder" aria-hidden="true">{p.emoji}</span>}<div><span className="products-kicker">{label} · {catalogCategories[p.category]}</span><h1>{p.name}</h1><p>{p.detail}</p><strong className="product-detail-price">{comparisonWon(p.price)}{p.priceNote?.includes('시작가')?'부터':''}</strong><p>등록된 판매 옵션 기준 · 배송비 별도</p><a className="products-button" href={p.productUrl!} target="_blank" rel="noopener noreferrer">판매처에서 옵션·가격 확인 ↗</a></div></section>
  <section className="products-note"><h2>가격과 판매 구성</h2><dl className="product-facts"><dt>등록 수량</dt><dd>{p.quantity}{p.unit}</dd><dt>단위 가격</dt><dd>{price?`${price.basis}당 ${comparisonWon(price.amount)}`:'미확인'}</dd><dt>가격 확인일</dt><dd>{p.priceCheckedAt?.slice(0,10)??'미확인'}</dd><dt>판매가 안내</dt><dd>{p.priceNote??'판매 구성과 최종 결제금액은 원문 판매처에서 확인하세요.'}</dd></dl><p>1개는 판매 묶음일 수 있습니다. 등록 수량이나 제품 이름으로 끼니 수를 추정하지 않아요. 묶음 전체의 결제 금액과 실제 먹을 분량을 구분하세요.</p></section>
  <section className="product-nutrition-section"><h2>영양성분과 원문 출처</h2><p>원문 기준량: <strong>{p.nutritionBasis??'미확인'}</strong></p>{!n.unit&&<p className="products-note">동일 단위로 환산할 기준이 부족하거나 일반 식품 참고값입니다. 아래 원문 기준을 확인하세요.</p>}<div className="comparison-table-scroll"><table><caption>미확인은 0이 아닙니다. 조리 상태·선택 옵션을 원문과 함께 확인하세요.</caption><thead><tr><th scope="col">영양성분</th><th scope="col">원문 기준량당</th>{n.unit&&<th scope="col">100{n.unit} 환산</th>}</tr></thead><tbody>{([['caloriesKcal','calories','열량',' kcal'],['proteinG','protein','단백질','g'],['carbohydratesG','carbs','탄수화물','g'],['fatG','fat','지방','g'],['sodiumMg','sodium','나트륨','mg']] as const).map(([raw,key,title,unit])=><tr key={raw}><th scope="row">{title}</th><td>{nutritionDisplay(sourced?p[raw]:null,unit)}</td>{n.unit&&<td>{nutritionDisplay(n[key],unit)}</td>}</tr>)}</tbody></table></div><p>{p.nutritionSourceName??'출처 이름 미등록'} · 정보 갱신 {p.updatedAt?.slice(0,10)??'미확인'}</p><div className="products-source-links">{p.nutritionSourceUrl&&<a href={p.nutritionSourceUrl} target="_blank" rel="noopener noreferrer">영양정보 원문 ↗</a>}{p.nutritionPhotoUrl&&<a href={p.nutritionPhotoUrl} target="_blank" rel="noopener noreferrer">등록된 영양표 사진 ↗</a>}</div></section>
  <section className="products-note"><h2>원재료·알레르기 확인</h2><p>{allergyStatuses[p.allergyInfo?.status??'unknown']}</p><p>{p.allergens?.length?p.allergens.map(k=>allergenOptions[k]??k).join(', '):'확인된 알레르기 성분이 등록되지 않았습니다. 알레르기 성분이 없다는 뜻은 아닙니다.'}</p><p>실제 구매할 옵션의 원재료와 알레르기 표시는 판매처·포장지에서 확인하세요.</p></section>
  <section className="product-related"><h2>함께 비교할 {label}</h2><div className="products-related-grid">{related.map(x=><Link key={x.id} href={productPath(x.id)}><strong>{x.name}</strong><span>{comparisonWon(x.price)}</span><small>{x.detail}</small></Link>)}</div>{p.foodType&&<Link href={foodPath(p.foodType)}>{label} 나란히 비교하기 →</Link>}</section>
 </>;
}
