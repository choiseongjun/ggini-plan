import {excludedFoods, excludedFoodAliases, type ExcludedFood} from './excluded-foods';
import type {PlanConditions, PlanProduct} from './shopping-plan';

export function allowsExcludedFoods(product:PlanProduct,excluded:ExcludedFood[]){
 const text=`${product.name} ${product.avoidanceText??''}`;
 return !excluded.length||(product.avoidanceText!==null&&!excluded.some(key=>product.allergens?.includes(key)||excludedFoodAliases[key].some(word=>text.includes(word))));
}

// Move exact legacy ingredient names into visible checkboxes, retaining custom text.
export function resolveShoppingExclusions(c:PlanConditions,defaults:ExcludedFood[]):PlanConditions{
 const excluded=new Set(c.excluded??defaults),custom:string[]=[];
 for(const word of c.avoid.split(/[,，\n]/).map(s=>s.trim()).filter(Boolean)){
  const key=(Object.keys(excludedFoods) as ExcludedFood[]).find(key=>excludedFoods[key]===word||excludedFoodAliases[key].includes(word));
  if(key)excluded.add(key);else custom.push(word);
 }
 return {...c,excluded:[...excluded],avoid:custom.join(', ')};
}
