import type {PlanProduct} from './shopping-plan';
import type {ExcludedFood} from './excluded-foods';
import {pantrySourceProducts} from './pantry-source-recommendations';
import {allowsExcludedFoods} from './shopping-exclusions';
import {missingPantryIngredients,pantryShortage} from './pantry-recommendation';

export function browsePantryMenus(products:PlanProduct[],{owned,excluded,query,offset,allowShopping}:{owned:string[];excluded:ExcludedFood[];query:string;offset:number;allowShopping:boolean}){
 const seen=new Set<string>();
 const pool=[...pantrySourceProducts(),...products].filter(p=>{
  if(!p.recipe?.ingredients.length||p.recipe.assembly||!allowsExcludedFoods(p,excluded))return false;
  // Prefer the source-backed version and omit alternate side-dish combinations of the same menu.
  const name=p.name.replaceAll('계란','달걀').replace(/\s/g,'');
  if(seen.has(name))return false;
  seen.add(name);return true;
 }).filter(p=>(allowShopping||missingPantryIngredients(p,owned).length===0)&&`${p.name} ${p.recipe!.ingredients.map(i=>i.product.name).join(' ')}`.replaceAll('계란','달걀').includes(query.trim().replaceAll('계란','달걀')));
 const shortages=new Map(pool.map(p=>[p.id,pantryShortage(p,owned)]));
 if(owned.length)pool.sort((a,b)=>shortages.get(a.id)!.main.length-shortages.get(b.id)!.main.length||shortages.get(a.id)!.seasonings.length-shortages.get(b.id)!.seasonings.length);
 return {products:pool.slice(offset,offset+12),total:pool.length};
}
