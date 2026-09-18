import Link from 'next/link';
import {pageMetadata,indexable} from '../../lib/seo';
import {foodDeals} from '../../lib/food-deals-db';
import {dealState} from '../../lib/food-deals';
import {foodTypes} from '../../lib/catalog-food-types';
import {comparisonWon,productPath} from '../../lib/product-comparison';
import './style.css';
export const dynamic='force-dynamic';
export async function generateMetadata({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const q=await searchParams;return {...pageMetadata('식품 핫딜 모음 | 끼니플랜','식품 특가의 판매 구성, 할인 조건, 배송비와 원문 출처를 확인하세요.','/deals'),robots:{index:indexable&&!Object.keys(q).length,follow:true}};}
export default async function Deals({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const query=await searchParams;const kind=typeof query.kind==='string'?query.kind:'all',source=typeof query.source==='string'?query.source:'all',history=query.history==='1';
 let items:Awaited<ReturnType<typeof foodDeals>>=[];let failed=false;try{items=await foodDeals();}catch{failed=true;}
 const filtered=items.filter(d=>(kind==='all'||d.food_type===kind)&&(source==='all'||d.source_name===source)&&(history||dealState(d)==='live'));
 return <><section className="products-intro"><span className="products-kicker">구성·쿠폰 조건까지 확인해요</span><h1>식품 핫딜 모음</h1><p>판매처 행사와 커뮤니티에서 발견한 식품 특가예요. 누구나 같은 가격에 살 수 있는지 할인 조건을 먼저 확인하세요.</p></section>
 <form className="product-search" action="/deals"><label>음식 종류<select name="kind" defaultValue={kind}><option value="all">전체</option>{Object.entries(foodTypes).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>출처<select name="source" defaultValue={source}><option value="all">전체 출처</option>{[...new Set(items.map(d=>d.source_name))].map(s=><option key={s}>{s}</option>)}</select></label><label><input type="checkbox" name="history" value="1" defaultChecked={history}/>종료·재확인 필요 포함</label><button type="submit">적용</button></form>
 <p className="products-note">24시간 이내에 확인한 정보부터 보여드려요. 확인 이후 가격·재고가 바뀔 수 있으며 최저가를 보장하지 않아요.</p>
 {failed?<p role="alert">핫딜을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.</p>:!filtered.length?<section className="products-note"><h2>현재 조건에 맞는 확인된 핫딜이 없어요</h2><p>새로운 식품 특가를 확인하는 중이에요. 종료·재확인 필요 항목을 포함하거나 필터를 바꿔 보세요.</p><Link href="/products">등록 상품 가격·영양 비교하기 →</Link></section>:<div className="deal-grid">{filtered.map(d=>{const state=dealState(d);return <article key={d.id} className="deal-card"><div className="deal-badges"><span>{foodTypes[d.food_type as keyof typeof foodTypes]}</span><b>{state==='live'?'최근 확인':state==='ended'?'종료':'재확인 필요'}</b></div><h2>{d.title}</h2><strong className="deal-price">{comparisonWon(d.price)}</strong><p>{d.pack}</p><p>배송비 {d.shipping===null?'미확인':d.shipping===0?'무료':comparisonWon(d.shipping)}</p><details open><summary>이 가격에 구매하는 조건</summary><p className="deal-conditions">{d.conditions}</p></details><small>확인 {d.checked_at?new Date(d.checked_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'미확인'}{d.ends_at?` · 종료 ${new Date(d.ends_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}`:' · 종료 시각 미확인'}</small><div className="deal-links"><a href={d.source_url} target="_blank" rel="noopener noreferrer">{d.source_name} 원문 ↗</a>{state==='live'?<a href={d.product_url} target="_blank" rel="noopener noreferrer">판매처에서 조건 확인 ↗</a>:<span>가격·재고 재확인 전 구매 안내 보류</span>}{d.product_id&&<Link href={productPath(d.product_id)}>연결 상품 영양·구성 확인 →</Link>}</div>{d.product_id&&<small>연결 상품과 행사 옵션·용량이 같은지 확인하세요. 핫딜 가격은 식단 예산에 자동 적용되지 않아요.</small>}</article>;})}</div>}
 <section className="products-note"><h2>특가를 발견했나요?</h2><p>원문 링크와 판매 링크, 할인 조건을 상품 제보에 남겨 주세요.</p><Link href="/submissions">식품 특가 제보하기 →</Link></section></>;
}
