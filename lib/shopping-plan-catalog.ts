import manifest from '../data/catalog-import-2026-09-16.json';
import { catalogItems } from './catalog-db';
import type { PlanProduct } from './shopping-plan';

export async function planProducts():Promise<PlanProduct[]> {
 const products=await catalogItems();
 return products.flatMap(p=>{
  const source=manifest.rows.find(row=>row.id===p.id);
  if(!source || source.name!==p.name || source.detail!==p.detail || !p.productUrl)return [];
  // Start with rice/noodle meals. Soups, sauces and side dishes need additional ingredients.
  if(!/볶음밥|솥밥|도시락|파스타|비빔국수/.test(p.name))return [];
  const text=`${p.name} ${p.detail}`;
  const explicit=text.match(/(\d+)\s*인분/)??text.match(/(\d+)\s*개입/)??text.match(/\((\d+)봉\)/);
  const grams=p.detail.replaceAll(',','').match(/^(\d+)g/i);
  const servings=explicit?Number(explicit[1]):(/도시락|파스타/.test(p.name)&&grams&&Number(grams[1])<=450?1:0);
  if(servings<1||servings>10)return [];
  return [{...p,servings,servingNote:explicit?`판매 구성 ${servings}인분/개입 기준`:'판매 1팩을 한 끼로 배정',avoidanceText:source.allergyText?.trim()||null}];
 });
}
