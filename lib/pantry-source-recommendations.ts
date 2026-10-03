import recipes from '../data/pantry-source-recipes.json';
import {withSourceRecipe} from './source-recipe';
import {missingPantryIngredients,pantryShortage} from './pantry-recommendation';
import {canonicalIngredient} from './ingredient-canonical';
import {allowsExcludedFoods} from './shopping-exclusions';
import type {ExcludedFood} from './excluded-foods';
import type {PlanProduct} from './shopping-plan';

// Reviewed source snapshots: never fill gaps with inferred catalog recipes.
export const pantrySourceProducts=()=>recipes.map(source=>withSourceRecipe({name:source.name,emoji:'🍳',family:source.family},source));
export function pantrySourceRecommendations(owned:string[],priority:string[],previous:string[],allowShopping:boolean,excluded:ExcludedFood[],simple:boolean){
 const available=new Set(owned.map(canonicalIngredient));
 const products=pantrySourceProducts().filter(p=>allowsExcludedFoods(p,excluded)&&(allowShopping||!missingPantryIngredients(p,owned).length));
 const score=(p:PlanProduct)=>priority.filter(n=>p.recipe!.ingredients.some(i=>canonicalIngredient(i.product.name)===canonicalIngredient(n))).length;
 const overlap=(p:PlanProduct)=>p.recipe!.ingredients.filter(i=>available.has(canonicalIngredient(i.product.name))).length;
 return products.sort((a,b)=>{
  const am=pantryShortage(a,owned),bm=pantryShortage(b,owned);
  return am.main.length-bm.main.length||score(b)-score(a)||am.seasonings.length-bm.seasonings.length||overlap(b)-overlap(a)||Number(previous.includes(a.id))-Number(previous.includes(b.id))||(simple?a.recipe!.ingredients.length-b.recipe!.ingredients.length:0);
 }).slice(0,3);
}
