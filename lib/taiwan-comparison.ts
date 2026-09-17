import {comparablePrice} from './product-comparison';
import type {CatalogItem} from './catalog';
export const twComparisonSorts={name:'商品名稱',price:'販售價格由低到高',protein:'每 100g 蛋白質由高到低',calories:'每 100g 熱量由低到高'} as const;
export const twProductPath=(id:string)=>'/tw/products/'+encodeURIComponent(id);
export const twFoodPath=(kind:string)=>'/tw/foods/'+encodeURIComponent(kind);
export const twNutritionDisplay=(n:number|null,unit:string)=>n===null?'尚未確認':new Intl.NumberFormat('zh-TW',{maximumFractionDigits:1}).format(n)+unit;
export function twComparablePrice(p:CatalogItem){const v=comparablePrice(p);return v?{...v,basis:v.basis==='1개'?'每個販售單位':'每 '+v.basis}:null;}
