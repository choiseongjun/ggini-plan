import {inferFoodType} from './catalog-food-types';

export const dealCategories = {ingredient:'식재료',frozen_meal:'냉동식품',meal_kit:'밀키트',ready_meal:'간편식',other:'기타 식품'} as const;
export function discountRate(original:number,price:number){
 return Number.isSafeInteger(original)&&Number.isSafeInteger(price)&&original>price&&price>0 ? Math.floor((original-price)*10000/original)/100 : null;
}
type Offer = {basePrice?:number;discountedPrice?:number;isSoldOut?:boolean;isPurchaseStatus?:boolean;isOnlyAdult?:boolean;canPurchaseLevel?:boolean;minEa?:number;bundleDiscounts?:unknown[]};
type Product = {no?:number;name?:string;categoryNames?:string[];isSoldOut?:boolean;isPurchaseStatus?:boolean;isOnlyAdult?:boolean;isMultiplePrice?:boolean;isGroupProduct?:boolean;minEa?:number;volume?:string;salesUnit?:string;storageTypes?:string[];dealProducts?:Offer[];deliveryTypeInfos?:{deliveryFeeDescription?:string}[]};
export function parseKurlyProduct(html:string,url:string){
 const match=html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
 if(!match)throw new Error('상품 데이터 형식 변경');
 const p=JSON.parse(match[1])?.props?.pageProps?.product as Product|undefined;
 if(!p||`https://www.kurly.com/goods/${p.no}`!==url||typeof p.name!=='string')throw new Error('상품 식별 정보 불일치');
 const categories=(p.categoryNames??[]).join(' ');
 // Positive food categories as well as exclusions: a sitemap also contains cosmetics and household goods.
 if(!/밀키트|간편|식품|채소|과일|쌀|잡곡|정육|수산|해산|고기|유제품|우유|달걀|계란|두부|베이커리|면류|만두|반찬|국\/|탕\/|소스|양념|오일|조미|떡|간식|시리얼|음료/.test(categories)||/반려|유아|이유식|주류|와인|맥주|영양제|건강기능|뷰티|주방|생활용품/.test(categories))return {kind:'skip' as const};
 if(p.isSoldOut===true||p.isPurchaseStatus===false)return {kind:'ended' as const};
 if(p.isOnlyAdult||p.isMultiplePrice||p.isGroupProduct||p.isPurchaseStatus!==true||p.dealProducts?.length!==1||(p.minEa??1)>1||!p.volume)return {kind:'skip' as const};
 const offer=p.dealProducts[0];
 if(offer.isSoldOut===true||offer.isPurchaseStatus===false)return {kind:'ended' as const};
 if(offer.isPurchaseStatus!==true||offer.isOnlyAdult||offer.canPurchaseLevel===false||(offer.minEa??1)>1)return {kind:'skip' as const};
 const original=offer.basePrice,price=offer.discountedPrice??original;
 if(typeof original!=='number'||typeof price!=='number'||original>10000000||price<=0||!Number.isSafeInteger(original)||!Number.isSafeInteger(price))throw new Error('가격 형식 변경');
 const rate=discountRate(original,price);
 if(rate===null)return {kind:'ended' as const};
 const category=/밀키트|키트/i.test(p.name+' '+categories)?'meal_kit':/수입육|한우|돼지고기|닭\/오리고기|채소|과일|쌀\/|잡곡|양념|오일|조미/.test(categories)?'ingredient':p.storageTypes?.includes('FROZEN')?'frozen_meal':'ready_meal';
 const delivery=[...new Set((p.deliveryTypeInfos??[]).map(x=>x.deliveryFeeDescription).filter(Boolean))].join(' / ');
 const fee=delivery.match(/^([\d,]+)원/);
 return {kind:'deal' as const,deal:{title:p.name.slice(0,180),food_type:inferFoodType(p.name)??'other',deal_category:category,price,original_price:original,discount_rate:rate,shipping:fee?Number(fee[1].replaceAll(',','')):delivery==='무료배송'?0:null,pack:[p.volume,p.salesUnit].filter(Boolean).join(' · ').slice(0,300),conditions:`판매처 정상가 대비 쿠폰 적용 전 표시가입니다. 추가 쿠폰·회원·카드 할인은 포함하지 않습니다. ${delivery?`판매처 배송 안내: ${delivery}.`:'배송비는 판매처에서 확인하세요.'} 지역·옵션·재고와 결제 금액을 확인하세요.`}};
}

// Respect the most specific matching robot group, then its longest matching path rule.
export function robotsAllows(text:string,path:string){
 const groups:{agents:string[];rules:{allow:boolean;path:string}[]}[]=[];
 let current:typeof groups[number]|undefined;
 for(const line of text.replace(/<br\s*\/?\s*>/gi,'\n').split(/\r?\n/)){
  const m=line.replace(/#.*/,'').trim().match(/^(user-agent|allow|disallow):\s*(.*)$/i);if(!m)continue;
  if(m[1].toLowerCase()==='user-agent'){if(!current||current.rules.length){current={agents:[],rules:[]};groups.push(current);}current.agents.push(m[2].toLowerCase());}
  else if(current&&m[2])current.rules.push({allow:m[1].toLowerCase()==='allow',path:m[2]});
 }
 const specific=groups.filter(g=>g.agents.some(a=>a!=='*'&&'gginiplan-deals'.includes(a)));
 const chosen=specific.length?specific:groups.filter(g=>g.agents.includes('*'));
 const rules=chosen.flatMap(g=>g.rules).filter(r=>new RegExp('^'+r.path.split('*').map(s=>s.replace(/[.+?^{}()|[\]\\]/g,'\\$&')).join('.*')).test(path)).sort((a,b)=>b.path.length-a.path.length||Number(b.allow)-Number(a.allow));
 return rules[0]?.allow??true;
}
