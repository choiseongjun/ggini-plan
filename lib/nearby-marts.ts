import {canonicalIngredient,PANTRY} from './ingredient-canonical';

// Nearby marts by a typed neighbourhood name — no device location is requested or sent.
export type MartOffer={ingredient:string;product:string;price:number;date:string};
export type NearbyMart={id:string;name:string;address:string;url:string;surveyed:boolean;offers:MartOffer[]};
export type MartSearch={area:string;keywords:string[]};

// 참가격 product names say 계란, recipes say 달걀.
const SURVEY_NAMES:Record<string,string>={달걀:'계란'};
export function martKeywords(ingredientNames:string[]){
 // 소금·간장 같은 기본 양념은 집에 있다고 보는 재료라 가격을 찾지 않는다.
 const names=ingredientNames.map(n=>canonicalIngredient(n)).filter(n=>!PANTRY.has(n)).map(n=>SURVEY_NAMES[n]??n);
 // One-letter names (파·무·밥) would match unrelated products such as 파스타.
 return [...new Set(names.filter(n=>/^[가-힣]{2,10}$/.test(n)))].slice(0,8);
}
export function parseMartSearch(value:unknown):MartSearch|null{
 if(!value||typeof value!=='object')return null;
 const v=value as Record<string,unknown>;
 if(typeof v.area!=='string'||v.area.trim().length<2||v.area.length>40)return null;
 if(!Array.isArray(v.items)||v.items.length>20||v.items.some(i=>typeof i!=='string'||i.length>40))return null;
 return {area:v.area.trim(),keywords:martKeywords(v.items as string[])};
}
// 참가격 조사 매장은 대부분 GS더프레시·롯데슈퍼라서 그 이름으로도 함께 찾는다. 동네 슈퍼마켓은 카카오에서
// 대형마트 분류(MT1) 없이 '가정,생활 > 슈퍼마켓'으로만 등록돼 있어 분류 없이 한 번 더 찾는다.
export const martSearchUrls=(area:string)=>[['마트','MT1'],['GS더프레시','MT1'],['롯데슈퍼','MT1'],['슈퍼마켓','']].map(([word,category])=>`https://dapi.kakao.com/v2/local/search/keyword.json?${new URLSearchParams({query:`${area} ${word}`,size:'10',...(category?{category_group_code:category}:{})})}`);
// 상품명에서 재료가 끝 단어일 때만 같은 재료로 본다: 뒤가 괄호·공백·끝(버터롤·양파링 제외),
// 앞이 처음·공백·한글(부침두부·꽃소금은 포함, '구운마늘&양파' 같은 다른 상품의 일부는 제외).
export const offerPattern=(keyword:string)=>`(^|[[:space:]가-힣])${keyword}([(]|[[:space:]]|$)`;
const offerRegExp=(keyword:string)=>new RegExp(`(^|[\\s가-힣])${keyword}([(]|\\s|$)`);
// 재료마다 가장 싼 상품 하나씩, 메뉴 재료 순서대로.
export function pickOffers(rows:{product:string;price:number;date:string}[],keywords:string[],limit=4):MartOffer[]{
 return keywords.flatMap(ingredient=>{
  const pattern=offerRegExp(ingredient);
  const best=rows.filter(r=>pattern.test(r.product)).sort((a,b)=>a.price-b.price)[0];
  return best?[{ingredient,product:best.product,price:best.price,date:best.date}]:[];
 }).slice(0,limit);
}
export const storeKey=(name:string)=>name.replace(/\(주\)|주식회사|\s/g,'').toLowerCase();
// 그 동네에 없는 체인을 찾으면 카카오가 전국 매장을 돌려준다 — 주소·이름에 동네 이름이 든 곳만 남긴다.
// '강남역'·'망원동'처럼 붙인 말은 떼고 비교한다(두 글자 이상 남을 때만).
const areaToken=(area:string)=>{const compact=area.replace(/\s/g,'');const stem=compact.replace(/(역|동|읍|면|구|시)$/,'');return stem.length>=2?stem:compact;};
export function parseMarts(data:unknown,area:string):NearbyMart[]{
 const token=areaToken(area);
 if(!data||typeof data!=='object'||!('documents' in data)||!Array.isArray(data.documents))return [];
 const seen=new Set<string>();
 return data.documents.flatMap(d=>{
  if(!d||typeof d.id!=='string'||!/^\d+$/.test(d.id)||seen.has(d.id)||typeof d.place_name!=='string'||(d.category_group_code!=='MT1'&&!String(d.category_name??'').endsWith('슈퍼마켓'))||/폐점|아이스크림/.test(d.place_name))return [];
  seen.add(d.id);
  const address=typeof d.road_address_name==='string'&&d.road_address_name?d.road_address_name:typeof d.address_name==='string'?d.address_name:'';
  if(![d.place_name,d.address_name,d.road_address_name].some(v=>typeof v==='string'&&v.replace(/\s/g,'').includes(token)))return [];
  return [{id:d.id,name:d.place_name.slice(0,100),address,url:`https://place.map.kakao.com/${d.id}`,surveyed:false,offers:[]}];
 });
}
