export const catalogSellers={kurly:'컬리',oasis:'오아시스',cj:'CJ더마켓',other:'기타 판매처'} as const;
export function catalogSeller(url?:string|null):keyof typeof catalogSellers{try{const host=new URL(url??'').hostname.toLowerCase().replace(/^www\./,'');return host==='kurly.com'?'kurly':host==='oasis.co.kr'||host==='m.oasis.co.kr'?'oasis':host==='cjthemarket.com'?'cj':'other';}catch{return 'other';}}
export const collectionCategories={tofu:'두부·콩',vegetables:'채소·버섯',meat:'정육·달걀',ready:'간편식·도시락'} as const;
export type CollectionSeller='kurly'|'oasis';
export type CollectionCategory=keyof typeof collectionCategories;
export function collectionInput(value:unknown){
 const v=value as Record<string,unknown>|null;
 if(!v||!['kurly','oasis'].includes(String(v.seller))||!Object.hasOwn(collectionCategories,String(v.category))||!Number.isInteger(v.count)||Number(v.count)<1||Number(v.count)>200||!Number.isInteger(v.offset)||Number(v.offset)<0||Number(v.offset)>=Number(v.count))return null;
 return {seller:v.seller as CollectionSeller,category:v.category as CollectionCategory,count:Number(v.count),offset:Number(v.offset)};
}
