import data from '../data/recipe-comparison.json';
import {excludedFoodAliases,type ExcludedFood} from './excluded-foods';
import type {PlanConditions} from './shopping-plan';

export const recipeIngredients=data.ingredients;
export type RecipeIngredientKey=keyof typeof recipeIngredients;
export type EstimateRecipe={id:string;name:string;minutes:string;match:RegExp;parts:[RecipeIngredientKey,number][];steps:string[];portionCount:number;source:{kind:string;note:string}};
export const estimateRecipes:EstimateRecipe[]=data.recipes.map(r=>({...r,match:new RegExp(r.match),parts:r.parts.map(([id,amount])=>[id as RecipeIngredientKey,Number(amount)])}));
export function recipeIngredientsFor(recipe:EstimateRecipe){
 return recipe.parts.map(([id,amount])=>({id,...recipeIngredients[id],amount}));
}
export function allowedEstimateRecipes(c:PlanConditions){
 const words=c.avoid.split(/[,，\n]/).map(s=>s.trim()).filter(Boolean);
 return estimateRecipes.filter(r=>{
  const rows=recipeIngredientsFor(r),text=[r.name,...rows.map(i=>i.name)].join(' ');
  return !(c.excluded??[]).some(key=>rows.some(i=>(i.exclude as ExcludedFood[]).includes(key))||excludedFoodAliases[key].some(word=>text.includes(word)))&&!words.some(word=>text.includes(word));
 });
}
