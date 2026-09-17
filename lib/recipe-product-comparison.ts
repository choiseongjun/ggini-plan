import data from '../data/recipe-comparison.json';
import type {CatalogItem} from './catalog';
import {excludedFoodAliases} from './excluded-foods';
import {recipeIngredientsFor,type EstimateRecipe} from './recipe-estimates';
import type {PlanConditions} from './shopping-plan';

function permitted(p:CatalogItem,c:PlanConditions){
 const excluded=c.excluded??[],words=c.avoid.split(/[,，\n]/).map(s=>s.trim()).filter(Boolean);
 if((excluded.length||words.length)&&(!p.allergyInfo||p.allergyInfo.status==='unknown'))return false;
 const text=`${p.name} ${p.allergyInfo?.statement??''} ${(p.allergens??[]).join(' ')}`;
 return !excluded.some(key=>excludedFoodAliases[key].some(word=>text.includes(word)))&&!words.some(word=>text.includes(word));
}
export function compareRecipeProducts(recipe:EstimateRecipe,catalog:CatalogItem[],conditions:PlanConditions,owned:string[]=[],servings=1){
 const count=Number.isFinite(servings)?Math.max(1,Math.min(7,Math.floor(servings))):1;
 const rows=recipeIngredientsFor(recipe).map(row=>{
  const contract=data.productLinks.find(l=>l.key===row.id&&l.amountUnit===row.unit&&l.amount>0);
  const product=contract?catalog.find(p=>p.id===contract.id&&p.name===contract.name&&p.detail===contract.detail&&p.unit===contract.unit&&p.quantity===contract.quantity&&p.category==='ingredient'&&p.productUrl===contract.sourceUrl&&Number.isFinite(p.price)&&p.price>0&&p.priceCheckedAt&&Number.isFinite(Date.parse(p.priceCheckedAt))&&p.currency===data.currency&&p.market===data.market&&permitted(p,conditions)):undefined;
  const pack=product?contract!.amount:null;
  const required=row.amount*count;
  const enough=owned.includes(row.id)||!!(product&&conditions.owned.includes(product.id));
  const supplied=product?conditions.supply?.[product.id]??0:0;
  const stock=pack!==null&&Number.isFinite(supplied)?Math.max(0,supplied)*pack:0;
  const have=enough?Math.max(required,stock):stock;
  const packs=enough?0:pack===null?null:Math.max(0,Math.ceil(Math.max(0,required-have)/pack-1e-9));
  const usedCost=product&&pack!==null?product.price*required/pack:null;
  const purchaseCost=packs===0?0:product&&packs!==null?packs*product.price:null;
  const left=pack!==null&&packs!==null?Math.max(0,have+packs*pack-required):null;
  return {...row,product,pack,amount:required,packs,have,usedCost,purchaseCost,left};
 });
 const linked=rows.filter(r=>r.usedCost!==null).length;
 const purchaseMissing=rows.filter(r=>r.purchaseCost===null).length;
 const usedSubtotal=Math.round(rows.reduce((s,r)=>s+(r.usedCost??0),0));
 const purchaseSubtotal=Math.round(rows.reduce((s,r)=>s+(r.purchaseCost??0),0));
 return {rows,count,linked,missing:rows.length-linked,purchaseMissing,usedSubtotal,purchaseSubtotal,
  usedTotal:linked===rows.length?usedSubtotal:null,purchaseTotal:purchaseMissing===0?purchaseSubtotal:null};
}
