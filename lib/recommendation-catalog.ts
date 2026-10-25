import {withKfindNutrition} from './kfind-plan-products';
import {gzipSync,gunzipSync} from 'node:zlib';
import {getPool} from './db';
import {listRecipeOptimizerResults} from './recipe-optimizer-store';
import {recipeProductsFromResults} from './recipe-optimizer-plan';
import {listPairings} from './meal-pairing-store';
import {applyPairings} from './meal-pairings';
import {slimRecipe} from './shopping-plan-catalog';
import {reviewedRecipeImages} from './reviewed-recipe-images';
import type {PlanProduct} from './shopping-plan';
import type {DetailedNutritionData} from './detailed-nutrition';

export const RECOMMENDATION_CATALOG_TAG='recommendation-catalog-v1';

// Preserve every scoring/price/ingredient field. Only display data is loaded later.
export async function buildRecommendationCatalog():Promise<PlanProduct[]>{
 const [results,relations]=await Promise.all([listRecipeOptimizerResults(true),listPairings()]);
 const official=await withKfindNutrition(recipeProductsFromResults(results),recipeProductsFromResults(results,'side'));
 return applyPairings(official.mains,official.sides,relations).map(slimRecipe);
}

// Compression preserves exact values and keeps the Data Cache entry below its size limit.
export function encodeRecommendationCatalog(products:PlanProduct[]){
 const references:Record<string,DetailedNutritionData>={};
 const compact=products.map(p=>p.officialNutrition?{...p,officialNutrition:{parts:p.officialNutrition.parts.map(part=>{
  if(part.reference)references[part.code]=part.reference;
  return {...part,reference:part.reference?part.code:null};
 })}}:p);
 const encoded=gzipSync(JSON.stringify({products:compact,references})).toString('base64');
 if(Buffer.byteLength(encoded)>1_900_000)throw new Error('Recommendation catalog exceeds cache entry limit');
 return encoded;
}
export function decodeRecommendationCatalog(encoded:string):PlanProduct[]{
 const data=JSON.parse(gunzipSync(Buffer.from(encoded,'base64')).toString('utf8'));
 if(Array.isArray(data))return data;
 return (data.products as PlanProduct[]).map(p=>p.officialNutrition?{...p,officialNutrition:{parts:p.officialNutrition.parts.map(part=>({...part,reference:typeof part.reference==='string'?data.references[part.reference]??null:part.reference}))}}:p);
}

type Detail={food_code:string;image_url:string|null;image_urls:string[]|null;note:string|null};
export async function hydrateRecommendationProducts(products:PlanProduct[]):Promise<PlanProduct[]>{
 const baseId=(p:PlanProduct)=>p.recipe?.composition?.items.find(i=>i.role==='main')?.id??p.id;
 const sourceIds=[...new Set(products.flatMap(p=>[baseId(p),...(p.recipe?.composition?.items.filter(i=>i.role!=='main').map(i=>i.id)??[])]))];
 if(!sourceIds.length)return [];
 const codes=sourceIds.map(id=>id.replace(/^recipe-opt-/,''));
 const {rows}=await getPool().query<Detail>(`SELECT food_code,image_url,image_urls,ai_ingredients->>'note' AS note
  FROM recipe_optimizer_results WHERE food_code=ANY($1::text[])`,[codes]);
 const details=new Map(rows.map(row=>[`recipe-opt-${row.food_code}`,row]));
 const display=(id:string,steps:string[])=>{
  const row=details.get(id);
  if(!row)throw new Error('Selected recipe details are unavailable');
  const reviewed=reviewedRecipeImages(row.food_code,row.image_url);
  return {productImageUrl:reviewed!==undefined?reviewed[0]??null:row.image_url,productImageUrls:reviewed??row.image_urls,steps:[row.note??'',...steps.slice(1)]};
 };
 return products.map(p=>{
  if(!p.recipe)return p;
  const main=display(baseId(p),p.recipe.steps.slice(0,2));
  const sideIds=p.recipe.composition?.items.filter(i=>i.role!=='main').map(i=>i.id)??[];
  const sides=p.recipe.sides?.map((side,i)=>({...side,...display(sideIds[i],side.steps)}));
  return {...p,productImageUrl:main.productImageUrl,productImageUrls:main.productImageUrls,
   recipe:{...p.recipe,...(sides?{sides}:{}),steps:[...main.steps,...(sides??[]).flatMap(side=>side.steps.map(step=>`${side.name}: ${step}`))]}};
 });
}
