import {foodTypes} from './catalog-food-types';
export type FoodDeal={original_price?:number|null;discount_rate?:number|null;collection_source?:string|null;deal_category?:string;id:string;title:string;food_type:string;source_name:string;source_url:string;product_url:string;price:number;shipping:number|null;pack:string;conditions:string;product_id:string|null;status:'draft'|'live'|'ended';checked_at:string|null;ends_at:string|null;updated_at:string};
export function publicUrl(value:unknown){
 if(typeof value!=='string'||value.length>2000)return null;
 try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname.includes('.')||/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname)||u.hostname.includes(':'))return null;u.hash='';return u.toString();}catch{return null;}
}
export function parseDeal(raw:unknown){
 if(!raw||typeof raw!=='object')return null;const p=raw as Record<string,unknown>;
 const text=(key:string,max:number)=>typeof p[key]==='string'&&p[key].trim().length>0&&p[key].trim().length<=max?p[key].trim():null;
 const title=text('title',180),source_name=text('source_name',60),pack=text('pack',300),conditions=text('conditions',1500),source_url=publicUrl(p.source_url),product_url=publicUrl(p.product_url);
 if(!title||!source_name||!pack||!conditions||!source_url||!product_url||typeof p.food_type!=='string'||!Object.hasOwn(foodTypes,p.food_type)||!Number.isSafeInteger(p.price)||Number(p.price)<=0||Number(p.price)>10000000||!['draft','live','ended'].includes(String(p.status)))return null;
 if(p.shipping!==null&&(!Number.isSafeInteger(p.shipping)||Number(p.shipping)<0||Number(p.shipping)>1000000))return null;
 if(p.id!==undefined&&(typeof p.id!=='string'||!/^([0-9a-f]{8}-)([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(p.id)))return null;
 if(p.product_id!==null&&(typeof p.product_id!=='string'||p.product_id.length>200||!p.product_id))return null;
 if(p.ends_at!==null&&(typeof p.ends_at!=='string'||!Number.isFinite(Date.parse(p.ends_at))))return null;
 if(p.status==='live'&&(p.reviewed!==true||(p.ends_at&&Date.parse(String(p.ends_at))<=Date.now())))return null;
 return {id:p.id as string|undefined,title,source_name,pack,conditions,source_url,product_url,food_type:p.food_type,price:p.price as number,shipping:p.shipping as number|null,product_id:p.product_id as string|null,status:p.status as FoodDeal['status'],ends_at:p.ends_at?new Date(String(p.ends_at)).toISOString():null};
}
export function dealState(deal:Pick<FoodDeal,'status'|'checked_at'|'ends_at'|'collection_source'>,now=Date.now()){
 if(deal.status==='draft')return 'draft';
 if(deal.status==='ended'||(deal.ends_at&&Date.parse(deal.ends_at)<=now))return 'ended';
 if(!deal.checked_at||!Number.isFinite(Date.parse(deal.checked_at))||now-Date.parse(deal.checked_at)>(deal.collection_source?36:24)*3600000)return 'stale';
 return 'live';
}
