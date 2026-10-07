import mapping from '../data/regional-prices/recommendation-mapping.json';
import type {PlanProduct} from './shopping-plan';
import {canonicalIngredient,PANTRY} from './ingredient-canonical';

export type RegionalPrice = {source?:string;region:string;name:string;variety:string;grade:string;unit:string;price:number;previous:number|null;date:string;previousDate:string};
export type PriceContext = {region:string;rows:RegionalPrice[];today:string};
export type PriceReason = {ingredient:string;region:string;computed?:boolean;variety:string;grade:string;unit:string;date:string;previousDate:string;drop:number;price:number;previous:number};
const day=(date:string)=>{const n=Date.parse(date+'T00:00:00Z');return /^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===date?n:NaN;};
// No cross-region fallback; only same-row, explicit seven-day comparisons.
export function priceSignal(product:PlanProduct,context:PriceContext):{bonus:number;reasons:PriceReason[]}{
 // Compare canonical names (대파 → 파). Home recipes skip basic seasonings: a cheaper 간장 would lift almost every recipe.
 const names=new Set(product.sourceRecipe?.ingredients.filter(i=>!i.optional).map(i=>canonicalIngredient(i.name))??product.recipe?.ingredients.map(i=>canonicalIngredient(i.product.name)).filter(n=>!PANTRY.has(n))??[]);
 const now=day(context.today);
 const reasons:PriceReason[]=[];
 for(const ingredient of mapping){
  if(!ingredient.recipeNames.some(n=>names.has(canonicalIngredient(n))))continue;
  const candidates=context.rows.filter(r=>r.region===context.region&&ingredient.kamisNames.includes(r.name)&&(!ingredient.varieties.length||ingredient.varieties.includes(r.variety))&&r.grade==='상품'&&r.unit&&Number.isFinite(r.price)&&r.price>0&&Number.isFinite(r.previous)&&r.previous!>0&&now>=day(r.date)&&now-day(r.date)<=7*86400000&&day(r.date)-day(r.previousDate)===7*86400000);
  // Deterministic reference series, not the largest discount among varieties.
  candidates.sort((a,b)=>b.date.localeCompare(a.date)||a.variety.localeCompare(b.variety)||a.unit.localeCompare(b.unit));
  const row=candidates[0];if(!row||row.price>=row.previous!)continue;
  const drop=Math.round((1-row.price/row.previous!)*1000)/10;
  if(drop<1)continue;
  reasons.push({ingredient:ingredient.name,region:row.region,computed:row.source==='kamis-computed',variety:row.variety,grade:row.grade,unit:row.unit,date:row.date,previousDate:row.previousDate,drop,price:row.price,previous:row.previous!});
 }
 reasons.sort((a,b)=>b.drop-a.drop||a.ingredient.localeCompare(b.ingredient));
 return {bonus:Math.min(3,reasons.reduce((n,r)=>n+Math.min(r.drop,20)/20,0)),reasons};
}

export const priceRegionLabel=(region:string,computed?:boolean)=>computed?`${region} 평균(계산값)`:region;
export function priceReasonText(r:PriceReason){return `${r.ingredient} 지난주보다 ${r.drop}% 저렴 · ${priceRegionLabel(r.region,r.computed)} ${r.date.slice(5).replace('-','/')} 조사 (${r.variety} ${r.unit})`;}
