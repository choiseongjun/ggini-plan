import {getPool} from './db';
import {inferFoodType} from './catalog-food-types';
import {robotsAllows} from './food-deal-parser';
import {type CollectionCategory,type CollectionSeller,collectionInput} from './catalog-sellers';
const categoryIds={tofu:242,vegetables:142,fruit:122,grain:9,meat:3,seafood:4,dairy:1184,kimchi:241,ready:53};
const matches:Record<CollectionCategory,RegExp>={tofu:/두부|콩비지/,vegetables:/채소|버섯|양배추|대파|양파|당근|감자|브로콜리|시금치|콩나물|숙주|청경채|오이|가지|파프리카|애호박|깻잎|배추|토마토/,fruit:/사과|배|감귤|밀감|귤|포도|샤인머스캣|바나나|딸기|참외|수박|멜론|자두|복숭아|키위|파인애플|망고|체리|블루베리|레몬|오렌지|자몽|황금향|한라봉|천혜향|무화과|석류|토마토/,grain:/쌀|현미|잡곡|보리|귀리|오트밀|퀴노아|흑미|찹쌀|율무|수수|기장|렌틸|파로|곡물/,meat:/돼지|한돈|한우|소고기|닭|달걀|계란|유정란|삼겹|목살|앞다리|안심|등심/,seafood:/고등어|연어|전복|장어|게장|동태|명태|갈치|삼치|굴비|조기|오징어|주꾸미|새우|멸치|참치|꽁치|아귀|낙지|문어|바지락|홍합|미역|다시마/,dairy:/우유|치즈|요거트|요구르트|버터|생크림|연유/,kimchi:/김치|깍두기|장아찌|절임|갓김치/,ready:/도시락|볶음밥|덮밥|파스타|죽|우동|밀키트|샌드위치|김밥|국밥|스프|수프|냉면|만두/};
export function matchesCollection(name:string,category:CollectionCategory){return matches[category].test(name)&&!/반려|강아지|고양이|용기|장난감|세제|이유식/.test(name)&&(category==='ready'||!/볶음밥|도시락|샌드위치|스낵|과자|칩|주스|튀김|밀키트|식빵|크림빵/.test(name));}
async function read(url:string){
 const response=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(7000)});
 if(!response.ok)throw new Error(`판매처 HTTP ${response.status}`);
 const reader=response.body!.getReader();const chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>5000000)throw new Error('상품 응답 크기 초과');chunks.push(value);}}finally{await reader.cancel();}
 return Buffer.concat(chunks).toString('utf8');
}
export function oasisProductIds(html:string){const list=html.split('class="listProductNew"')[1]??'';return [...new Set([...list.matchAll(/<li[^>]*data-productid="(\d+)"/g)].map(m=>m[1]))];}
export function parseCollectedProduct(html:string,id:string,seller:CollectionSeller,category:CollectionCategory){
 let name:string,price:number,image:string,detail:string;
 if(seller==='oasis'){
  name=html.match(/property="og:title" content="([^"]+)"/)?.[1]??'';
  image=html.match(/property="og:image" content="([^"]+)"/)?.[1]??'';
  price=Number(html.match(/var discountPrice = "(\d+)"/)?.[1]);
  const displayed=Number(html.match(/class="totalCouponDiscountPrice_price">([\d,]+)원/)?.[1]?.replaceAll(',',''));
  if(price!==displayed||!image.startsWith('https://oasisprodproduct.edge.naverncp.com/'))throw new Error('가격·사진 확인 실패');
  const pack=name.match(/\d+(?:\.\d+)?\s*(?:kg|g|ml|L|개|입|구)(?:\s*[xX×]\s*\d+\s*(?:개|입|팩|봉)?)?/i)?.[0];
  if(!pack||/옵션|골라담|택1|택 1|부터/.test(name))throw new Error('판매 구성 검토 필요');
  detail=`${pack} · 1팩`;
 }else{
  const raw=html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  const p=raw?JSON.parse(raw).props?.pageProps?.product:null;
  if(!p||String(p.no)!==id||p.isSoldOut||!p.isPurchaseStatus||p.isMultiplePrice||p.isGroupProduct||p.dealProducts?.length!==1||p.minEa>1)throw new Error('품절 또는 옵션 상품');
  const o=p.dealProducts[0];if(o.isSoldOut||!o.isPurchaseStatus||o.minEa>1)throw new Error('판매 불가');
  name=p.name;price=o.discountedPrice??o.basePrice;image=p.mainImageUrl;detail=[p.volume,p.salesUnit,(p.storageTypes??[]).map((x:string)=>({COLD:'냉장',FROZEN:'냉동',ROOM:'상온'}[x]??x)).join('/')].filter(Boolean).join(' · ');
  if(!p.volume)throw new Error('판매 용량 미확인');
 }
 if(!name||name.length>120||!matchesCollection(name,category)||!Number.isSafeInteger(price)||price<=0||price>10000000||!image?.startsWith('https://'))throw new Error('선택 카테고리 또는 상품 정보 확인 실패');
 return {id:`${seller}-${id}`,name,price,image,detail:detail.slice(0,200),url:seller==='oasis'?`https://www.oasis.co.kr/product/detail/${id}`:`https://www.kurly.com/goods/${id}`,foodType:inferFoodType(name),category:category==='ready'?'ready_meal':'ingredient'};
}
export async function collectCatalog(input:NonNullable<ReturnType<typeof collectionInput>>){
 const {seller,category,count,offset}=input;const c=await getPool().connect();let locked=false;
 try{
  locked=(await c.query('SELECT pg_try_advisory_lock(741982,4) AS locked')).rows[0].locked;if(!locked)throw new Error('다른 상품 수집이 진행 중이에요. 잠시 후 다시 실행해 주세요.');
  let ids:string[]=[];let sourceNote='';
  if(seller==='oasis'){
   const page=Math.floor(offset/60)+1;
   ids=oasisProductIds(await read(`https://www.oasis.co.kr/product/list?categoryId=${categoryIds[category]}&page=${page}&sort=priority&direction=desc&rows=60`));
   ids=ids.slice(offset%60,Math.min(60,offset%60+Math.min(5,count-offset)));
  }else{
   const robots=await read('https://www.kurly.com/robots.txt');if(!robotsAllows(robots,'/goods/1001866269'))throw new Error('판매처 수집 제한');
   const known=(await c.query("SELECT product_url,name FROM catalog_items WHERE market_code='KR' AND product_url ~ '^https://www[.]kurly[.]com/goods/[0-9]+$' ORDER BY id")).rows.filter(p=>matchesCollection(p.name,category));
   const urls=[...new Set(known.map(p=>String(p.product_url)))];
   // Public sitemap supplements registered products; product detail validates category.
   if(urls.length<count){const index=await read('https://www.kurly.com/sitemap/index-sitemap.xml');const map=index.match(/<loc>(https:\/\/www\.kurly\.com\/sitemap\/goods-\d+\.xml)<\/loc>/)?.[1];if(map){const xml=await read(map);for(const m of xml.matchAll(/<loc>(https:\/\/www\.kurly\.com\/goods\/\d+)<\/loc>/g))if(!urls.includes(m[1]))urls.push(m[1]);}}
   ids=urls.slice(offset,Math.min(count,offset+5)).map(url=>url.split('/').pop()!);sourceNote='컬리는 등록된 카테고리 상품부터 확인하고 부족하면 공개 사이트맵을 탐색해요.';
  }
  const results=[];
  for(const id of ids){
   try{
    const url=seller==='oasis'?`https://www.oasis.co.kr/product/detail/${id}`:`https://www.kurly.com/goods/${id}`;
    const p=parseCollectedProduct(await read(url),id,seller,category);
    const old=(await c.query('SELECT * FROM catalog_items WHERE id=$1 OR product_url=$2',[p.id,p.url])).rows[0];
    if(old){if(old.name!==p.name||old.detail!==p.detail||old.market_code!=='KR'||old.currency_code!=='KRW')throw new Error('기존 판매 구성과 달라 검토 필요');await c.query('UPDATE catalog_items SET price=$2,product_image_url=$3,price_checked_at=NOW(),updated_at=NOW() WHERE id=$1',[old.id,p.price,p.image]);}
    else await c.query(`INSERT INTO catalog_items(id,name,detail,price,portions,quantity,unit,category,food_type,emoji,color,search_query,product_url,product_image_url,price_checked_at,price_note,in_weekly_cart,allergens,allergy_info,market_code,currency_code,source_locale) VALUES($1,$2,$3,$4,'판매 구성 1개',1,'개',$5,$6,'🧺','mint',$2,$7,$8,NOW(),'공개 판매 페이지 표시가 · 쿠폰·배송비 별도',false,ARRAY[]::text[],$9::jsonb,'KR','KRW','ko-KR')`,[p.id,p.name,p.detail,p.price,p.category,p.foodType,p.url,p.image,JSON.stringify({status:'unknown',statement:'',note:'원문 영양·알레르기 검수 전',sourceUrl:p.url,evidenceUrls:[]})]);
    results.push({name:p.name,status:old?'updated':'inserted',price:p.price});
   }catch(e){const message=e instanceof Error?e.message:'수집 오류';results.push({name:`${seller}-${id}`,status:'skipped',message:/HTTP|검토|확인|품절|판매 불가/.test(message)?message:'상품 확인 실패'});if(/HTTP (403|429)/.test(message))return {results,nextOffset:offset+results.length,done:true,stopped:true,sourceNote};}
   await new Promise(resolve=>setTimeout(resolve,250));
  }
  return {results,nextOffset:offset+ids.length,done:ids.length===0||offset+ids.length>=count,sourceNote};
 }finally{try{if(locked)await c.query('SELECT pg_advisory_unlock(741982,4)');}finally{c.release();}}
}
