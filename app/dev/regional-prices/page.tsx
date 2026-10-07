import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {notFound} from 'next/navigation';
import s from './prices.module.css';
import {StoreLocation} from './store-location';
import {pantrySourceRecommendations} from '../../../lib/pantry-source-recommendations';
import {priceReasonText} from '../../../lib/regional-price-recommendations';

export const dynamic='force-dynamic';
export const metadata={title:'우리 지역 장보기 시세 | 끼니플랜 실험실',robots:{index:false,follow:false}};
type Kamis={ingredientIds:string[];region:string;name:string;variety:string;unit:string;grade:string;price:number;previous:number|null;change:number|null;date:string;previousDate:string};
type Packaged={ingredientIds:string[];id:string;name:string;maker:string;date:string;count:number;minimum:number;maximum:number;average:number;offers:{store:string;storeId?:string;region?:string;price:number;sale:string|null;onePlusOne:string|null}[]};
type Ingredient={id:string;name:string;aliases:string[];productIds:string[]};
type Recipe={id:string;name:string;ingredientIds:string[]};
type Dataset={connections:{ingredients:Ingredient[];recipes:Recipe[]};manifest:{kamisDate:string;kamisPreviousDate:string;kamisMode:string;kamisRawRows:number;kamisCollectedAt:string|null;kamisRows:number;kamisRegions:string[];missingRegions:string[];tpriceRawRows:number;tpriceProducts:number;tpriceStores:number;tpriceMode?:string;tpriceCollectedAt?:string;tpriceDates:string[]};kamis:Kamis[];tprice:Packaged[]};
const won=(n:number)=>n.toLocaleString('ko-KR')+'원';


export default async function Page({searchParams}:{searchParams:Promise<{region?:string;q?:string;page?:string;ingredient?:string;owned?:string;prices?:string}>}){
 if(process.env.NODE_ENV!=='development')notFound();
 const filters=await searchParams;
 let data:Dataset;
 try{data=JSON.parse(await readFile(path.join(process.cwd(),'data/regional-prices/preview.json'),'utf8'));}
 catch{return <main className={s.page}><h1>수집 데이터가 아직 없습니다</h1><p>scripts/build-regional-prices.py를 실행해 로컬 데이터를 준비해주세요.</p></main>;}
 const region=data.manifest.kamisRegions.includes(filters.region||'')?filters.region!:'서울';
 const query=(filters.q||'').trim();
 const selected=data.connections.ingredients.find(i=>i.id===filters.ingredient || i.aliases.includes(query));
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date());
 const owned=(filters.owned||'').split(',').map(x=>x.trim()).filter(Boolean);
 const recommended=pantrySourceRecommendations(owned,[],[],true,[],false,[],[],6,filters.prices==='off'?undefined:{region,rows:data.kamis,today});
 const baseline=pantrySourceRecommendations(owned,[],[],true,[],false,[],[],30);
 const local=data.kamis.filter(p=>p.region===region);
 const raw=local.filter(p=>selected?p.ingredientIds.includes(selected.id):`${p.name} ${p.variety}`.includes(query)).sort((a,b)=>(a.change??999)-(b.change??999));
 const packaged=data.tprice.filter(p=>selected?p.ingredientIds.includes(selected.id):`${p.name} ${p.maker}`.includes(query));
 const page=Math.max(1,Math.min(Math.ceil(Math.max(raw.length,packaged.length)/12)||1,Number.parseInt(filters.page||'1')||1));
 const offset=(page-1)*12;
 const falling=local.filter(p=>p.change!==null&&p.change<0);
 const ingredientUrl=(id:string)=>'?'+new URLSearchParams({region,ingredient:id});
 const matches=data.connections.recipes.map(idea=>({...idea,found:idea.ingredientIds.filter(id=>falling.some(p=>p.ingredientIds.includes(id)))})).filter(i=>selected?i.ingredientIds.includes(selected.id):i.found.length).sort((a,b)=>b.found.length-a.found.length).slice(0,3);
 const url=(p:number)=>'?'+new URLSearchParams({region,q:query,ingredient:selected?.id||'',page:String(p)});
 return <main className={s.page}>
  <header className={s.hero}><span className={s.kicker}>끼니플랜 · 지역 물가 실험실</span><h1>이번 장보기,<br/>어떤 재료가 괜찮을까?</h1><p>지역의 식재료 시세와 조사된 상품 가격을 함께 살펴보세요.</p><div className={s.stats}><span><b>{data.manifest.kamisRows.toLocaleString()}</b> 지역·규격별 시세</span><span><b>{data.manifest.tpriceRawRows.toLocaleString()}</b> 판매가격 원본</span><span><b>{data.manifest.tpriceProducts}</b> 포장상품</span></div></header>
  <form className={s.filters}><label>조사 지역<select name="region" defaultValue={region}>{data.manifest.kamisRegions.map(r=><option key={r}>{r}</option>)}</select></label><label className={s.search}>재료·상품 검색<input name="q" defaultValue={query} placeholder="두부, 양파, 우유…"/></label><button>가격 살펴보기</button></form>
  <aside className={s.notice}><strong>조사 가격을 비교하는 로컬 미리보기입니다.</strong>{data.manifest.kamisMode==='api'&&<p>공식 API 수집 완료 · 원본 {data.manifest.kamisRawRows.toLocaleString()}건 · 마지막 수집 {new Date(data.manifest.kamisCollectedAt!).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}. 지역 가격은 동일 규격의 수집 판매점 단순평균입니다. 전주 판매점 구성이 달라지면 등락 비교에서 제외합니다.</p>}<p>KAMIS {data.manifest.kamisDate} / 참가격 {data.manifest.tpriceDates.join(" · ")}. 현재 매장 가격과 다를 수 있습니다. 서로 다른 조사일·규격·브랜드의 가격을 합산하거나 평균 내지 않습니다.</p><p>{data.manifest.tpriceMode==='web'?`참가격 공식 사이트 최신 조사분 수집 · ${new Date(data.manifest.tpriceCollectedAt!).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}. 판매점 소재 지역을 함께 표시합니다. 상품 평균은 전국 조사 판매점 기준입니다.`:'참가격 공개 파일 기준입니다. 판매점 지역은 미확인입니다.'}</p></aside>
  <section className={s.ideas}><div className={s.ingredientLinks}>{data.connections.ingredients.map(i=><a aria-current={selected?.id===i.id?"true":undefined} key={i.id} href={ingredientUrl(i.id)}>{i.name} · {i.productIds.length}개 상품</a>)}</div>{selected&&<p><strong>{selected.name}</strong>에 연결된 지역 시세·메뉴·상품입니다. 같은 재료 분류이며 같은 규격·브랜드라는 뜻은 아닙니다.</p>}<div><span className={s.kicker}>시세와 메뉴 연결</span><h2>{region}에서 가격이 내려간 재료로</h2><p>같은 규격의 {data.manifest.kamisPreviousDate} 가격과 비교 · 전체 식사 비용이 저렴하다는 뜻은 아닙니다.</p></div><div className={s.ideaGrid}>{matches.map(i=><article key={i.name}><h3>{i.name}</h3><p>{i.found.length?i.found.map(id=>data.connections.ingredients.find(x=>x.id===id)?.name).join(' · ')+' 시세 하락':'현재 지역의 하락 시세 없음'}</p><small>주요 재료를 눌러 상품 보기</small><div className={s.ingredientLinks}>{i.ingredientIds.map(id=><a key={id} href={ingredientUrl(id)}>{data.connections.ingredients.find(x=>x.id===id)?.name}</a>)}</div></article>)}{!matches.length&&<p>메뉴에 연결할 하락 품목이 아직 없습니다.</p>}</div></section>
  <section className={s.ideas}><span className={s.kicker}>실제 추천 엔진 · 출처 있는 레시피 30개</span><h2>이번 주 지역 시세로 메뉴 고르기</h2><p>보유 재료·우선 재료·취향·조리 조건을 먼저 고려하고, 동점 메뉴에 최대 3점의 가격 가산점을 줍니다. 조사일이 7일 넘게 지난 시세는 제외합니다.</p><form className={s.filters}><input type="hidden" name="region" value={region}/><label className={s.search}>보유 재료 (쉼표 구분)<input name="owned" defaultValue={filters.owned||''} placeholder="두부, 애호박, 대파, 간장"/></label><label>시세 반영<select name="prices" defaultValue={filters.prices||'on'}><option value="on">켜기</option><option value="off">끄기 · 기존 추천</option></select></label><button>추천 비교하기</button></form><div className={s.ideaGrid}>{recommended.map((p,index)=><article key={p.id}><h3>{index+1}. {p.name}</h3><small>기존 {baseline.findIndex(b=>b.id===p.id)+1}위 · 시세 가산점 {p.priceRecommendation.bonus.toFixed(2)}</small>{p.priceRecommendation.reasons.length?p.priceRecommendation.reasons.slice(0,2).map(r=><p key={r.ingredient}>{priceReasonText(r)}</p>):<p>적용 가능한 가격 하락 근거 없음</p>}<a href={p.sourceRecipe!.video.url} target="_blank" rel="noreferrer">출처 레시피 보기</a></article>)}</div><p>시세 하락은 메뉴 전체가 저렴하다는 뜻이 아닙니다. 재료비 총액은 분량·단위 검증 전까지 표시하지 않습니다.</p></section>
  <div className={s.columns}>
   <section><div className={s.sectionHead}><span className={s.badge}>KAMIS</span><h2>{region} 식재료 시세</h2><p>{raw.length}개 규격 · {data.manifest.kamisDate} 조사 · 단위별 참고 가격</p></div><div className={s.cards}>{raw.slice(offset,offset+12).map((p,i)=><article className={s.card} key={`${p.name}-${p.variety}-${p.grade}-${i}`}><div className={s.cardTop}><h3>{p.name}</h3><span className={p.change!==null&&p.change<0?s.down:s.muted}>{p.change===null?'비교값 없음':`${p.change>0?'+':''}${p.change}%`}</span></div><p>{p.variety} · {p.grade} · {p.unit}</p><strong className={s.price}>{won(p.price)}</strong><small>{p.previousDate} {p.previous===null?'조사값 없음':won(p.previous)}</small></article>)}</div>{!raw.length&&<p className={s.empty}>{data.manifest.missingRegions.includes(region)?'이 날짜에 조사 가격이 없습니다. 다른 지역을 선택해주세요.':'검색 결과가 없습니다.'}</p>}</section>
   <section><div className={s.sectionHead}><span className={s.badge}>참가격</span><h2>판매점별 포장상품</h2><p>{packaged.length}개 상품 · 전국 조사 판매점 기준</p></div><div className={s.cards}>{packaged.slice(offset,offset+12).map(p=><article className={s.card} key={p.id}><h3>{p.name}</h3><p>{p.maker} · {p.date} · {p.count}개 조사 판매점</p><strong className={s.price}>{won(p.average)} <em>평균</em></strong><small>같은 상품의 조사 가격 {won(p.minimum)} ~ {won(p.maximum)}</small><details><summary>전체 판매점 {p.offers.length}곳 보기 · 낮은 가격순</summary><ul>{p.offers.map(o=><li key={o.storeId||o.store}><div><span>{o.store}{o.region&&<small>{o.region}</small>}</span><StoreLocation store={o.store}/></div><b>{won(o.price)}</b></li>)}</ul><small>행사 여부가 빈 값이면 미확인입니다. 현재 재고·배송비는 제공되지 않습니다.</small></details></article>)}</div>{!packaged.length&&<p className={s.empty}>같은 검색어의 상품이 없습니다. 원재료와 가공상품은 별도로 조회합니다.</p>}</section>
  </div>
  <nav className={s.pagination} aria-label="가격 목록 페이지">{page>1&&<a href={url(page-1)}>← 이전</a>}<span>{page} / {Math.ceil(Math.max(raw.length,packaged.length)/12)||1}</span>{offset+12<Math.max(raw.length,packaged.length)&&<a href={url(page+1)}>다음 →</a>}</nav>
  <footer className={s.footer}>출처: <a href="https://www.kamis.or.kr/customer/price/agricultureRetail/catalogue.do">KAMIS 소매가격</a> · <a href="https://www.price.go.kr/tprice/portal/dailynecessitypriceinfo/priceiteminfo/getPriceItemInfoList.do">한국소비자원 참가격</a><p>참가격과 KAMIS 공식 자료 수집 결과입니다. 전체 역사 데이터나 전국 모든 판매점 데이터가 아닙니다.</p></footer>
 </main>;
}
