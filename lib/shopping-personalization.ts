import {servingNutrition} from './food-intake';
import {calorieEstimate, parseBodyProfile} from './body-profile';
import {parseDiet, dietStyles} from './meal-plan';
import {excludedFoods, type ExcludedFood} from './excluded-foods';
import {allowsExcludedFoods} from './shopping-exclusions';
import type {PlanProduct} from './shopping-plan';
import {nutritionIsEstimated} from './serving-nutrients';

export function personalizeProducts(products:PlanProduct[],raw:unknown,rawDiet:unknown){
 const profile=parseBodyProfile(raw),diet=parseDiet(rawDiet);
 const energy=profile?calorieEstimate(profile):null;
 const exclusions=diet?.excluded??[];
 const filtered=products.filter(p=>{
  const text=`${p.name} ${p.avoidanceText??''}`;
  if(!allowsExcludedFoods(p,exclusions))return false;
  if(diet?.style==='plant'&&!/비건|vegan/i.test(text))return false;
  return true;
 });
 const result=filtered.map(p=>{
  const {calories:kcal,protein}=servingNutrition(p);
  const fit=energy&&kcal!==null?Math.max(-150,100-200*Math.abs(kcal-energy.perMeal)/energy.perMeal):0;
  const preference=diet?.style==='protein'&&protein!==null?Math.min(60,protein*2):diet?.style==='quick'&&p.category!=='meal_kit'?40:0;
  return {...p,personalizationScore:profile?.pregnancy?0:(Math.min(0,fit)+Math.max(0,fit)*(nutritionIsEstimated(p)?0.55:1)+preference*(nutritionIsEstimated(p)?0.55:1)),servingCalories:kcal===null?null:Math.round(kcal)};
 });
 return {products:result,personalization:{hasProfile:Boolean(profile),blocked:Boolean(profile?.pregnancy),dailyCalories:energy?.daily??null,perMealCalories:energy?.perMeal??null,meals:profile?.meals??null,style:diet?dietStyles[diet.style]:null,excluded:exclusions.map(key=>excludedFoods[key as ExcludedFood]),nutritionMatched:energy?result.filter(p=>p.servingCalories!==null).length:0}};
}
