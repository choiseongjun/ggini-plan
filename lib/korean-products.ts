import {cache} from 'react';
import {catalogItems} from './catalog-db';
import {foodTypes,type FoodType} from './catalog-food-types';
export const getKoreanProducts=cache(async()=> (await catalogItems()).filter(p=>p.market==='KR'&&p.currency==='KRW'&&p.productUrl&&p.price>0));
export async function koreanFoodGroups(){const items=await getKoreanProducts();return (Object.entries(foodTypes) as [FoodType,string][]).map(([key,label])=>({key,label,count:items.filter(p=>p.foodType===key).length})).filter(g=>g.count>0);}
