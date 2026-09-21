import {servingNutrition} from './food-intake';
import {calorieEstimate, parseBodyProfile} from './body-profile';
import {parseDiet, dietStyles} from './meal-plan';
import {excludedFoods, type ExcludedFood} from './excluded-foods';
import {allowsExcludedFoods} from './shopping-exclusions';
import type {PlanProduct} from './shopping-plan';
import {servingNutrients, nutritionIsEstimated} from './serving-nutrients';
import {dailyNutritionReference} from './daily-nutrition-reference';
import {parseNutritionTarget, type NutritionTarget} from './nutrition-target';

function macroFit(p:PlanProduct,perMealCalories:number,target:NutritionTarget){
 const n=servingNutrients(p);
 const grams:[number|null,number,number][]=[[n.carbs,target.carbRatio,4],[n.protein,target.proteinRatio,4],[n.fat,target.fatRatio,9]];
 const scores=grams.filter(([actual])=>actual!==null).map(([actual,ratio,kcalPerGram])=>{
  const goal=perMealCalories*ratio/100/kcalPerGram;
  return goal>0?Math.max(-150,100-200*Math.abs(actual!-goal)/goal):0;
 });
 return scores.length?scores.reduce((sum,s)=>sum+s,0)/scores.length:0;
}

export function personalizeProducts(products:PlanProduct[],raw:unknown,rawDiet:unknown,rawTarget?:unknown){
 const profile=parseBodyProfile(raw),diet=parseDiet(rawDiet);
 const target=parseNutritionTarget(rawTarget);
 const energy=target?{daily:target.calories,perMeal:Math.round(target.calories/(profile?.meals??3))}:profile?calorieEstimate(profile):null;
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
  const macro=target&&energy?macroFit(p,energy.perMeal,target):0;
  const preference=diet?.style==='protein'&&protein!==null?Math.min(60,protein*2):diet?.style==='quick'&&p.category!=='meal_kit'?40:0;
  const weight=nutritionIsEstimated(p)?0.55:1;
  return {...p,personalizationScore:profile?.pregnancy?0:(Math.min(0,fit)+Math.max(0,fit)*weight+Math.min(0,macro)+Math.max(0,macro)*weight+preference*weight),servingCalories:kcal===null?null:Math.round(kcal)};
 });
 return {products:result,personalization:{nutritionReference:dailyNutritionReference(profile),hasProfile:Boolean(profile),blocked:Boolean(profile?.pregnancy),dailyCalories:energy?.daily??null,perMealCalories:energy?.perMeal??null,meals:profile?.meals??null,style:diet?dietStyles[diet.style]:null,excluded:exclusions.map(key=>excludedFoods[key as ExcludedFood]),nutritionMatched:energy?result.filter(p=>p.servingCalories!==null).length:0,manualTarget:target}};
}
