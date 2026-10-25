import {inferFoodType} from './catalog-food-types';
import {publicUrl} from './food-deals';

export const shoppingQueries=['계란 30구','두부 300g','돼지고기 앞다리살 1kg','닭가슴살 1kg','양파 1kg','냉동 만두','즉석밥','밀키트'] as const;
export function naverShoppingCredentials(){
 return {id:process.env.NAVER_SHOPPING_CLIENT_ID,secret:process.env.NAVER_SHOPPING_CLIENT_SECRET};
}
export function naverShoppingConfigured(){const c=naverShoppingCredentials();return !!(c.id&&c.secret);}
function plain(value:unknown,max:number){
 if(typeof value!=='string')return '';
 return value.replace(/<[^>]*>/g,'').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim().slice(0,max);
}
export function parseNaverShoppingDeals(data:unknown){
 if(!data||typeof data!=='object'||!('items' in data)||!Array.isArray(data.items))throw new Error('네이버 쇼핑 응답 형식을 확인할 수 없어요.');
 const seen=new Set<string>();
 return data.items.flatMap((raw:unknown)=>{
  if(!raw||typeof raw!=='object')return [];
  const p=raw as Record<string,unknown>,title=plain(p.title,180),mall=plain(p.mallName,60),url=publicUrl(p.link);
  const price=typeof p.lprice==='string'&&/^\d+$/.test(p.lprice)?Number(p.lprice):p.lprice;
  const categories=[p.category1,p.category2,p.category3,p.category4].map(v=>plain(v,100)).join(' ');
  if(p.category1!=='식품'||/주류|건강기능|영양제|분유|이유식|반려/.test(categories)||!['1','2','3'].includes(String(p.productType))||!title||!mall||!url||typeof price!=='number'||!Number.isSafeInteger(price)||price<=0||price>10000000||seen.has(url))return [];
  seen.add(url);
  return [{title,food_type:inferFoodType(title)??'other',source_name:mall,source_url:url,product_url:url,price,shipping:null,original_price:null,discount_rate:null,collection_source:'naver-shopping',deal_category:/밀키트/.test(categories+' '+title)?'meal_kit':/농산|축산|수산|채소|과일|쌀|계란|두부/.test(categories)?'ingredient':'other',pack:'상품명에 표시된 구성 기준 · 상세 옵션은 판매처 확인',conditions:'네이버 쇼핑 검색에 제공된 가격입니다. 할인 여부·배송비·쿠폰·회원 조건·재고는 확인되지 않았어요. 옵션에 따라 결제 금액이 다를 수 있으며, 전체 쇼핑몰 최저가를 보장하지 않아요.'}];
 });
}
export async function searchNaverShopping(query:string,request:typeof fetch=fetch){
 const {id,secret}=naverShoppingCredentials();if(!id||!secret)throw new Error('네이버 쇼핑 검색용 Client ID와 Secret을 설정해 주세요.');
 // Shopping is documented on the legacy Search API; do not invent a HUB shopping-search route.
 const params=new URLSearchParams({query,display:'20',start:'1',sort:'sim',exclude:'used:rental:cbshop'});
 const response=await request(`https://openapi.naver.com/v1/search/shop.json?${params}`,{redirect:'error',headers:{'X-Naver-Client-Id':id,'X-Naver-Client-Secret':secret},cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new Error(response.status===401||response.status===403?'네이버 쇼핑 검색 인증 실패: 쇼핑 검색 권한이 있는 키를 확인해 주세요.':`네이버 쇼핑 검색 HTTP ${response.status}`);
 return parseNaverShoppingDeals(await response.json());
}
