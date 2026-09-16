import {calorieEstimate, parseBodyProfile} from './body-profile';
import {parseDiet, dietStyles} from './meal-plan';
import {excludedFoodAliases, excludedFoods, type ExcludedFood} from './excluded-foods';
import type {PlanProduct} from './shopping-plan';

export function personalizeProducts(products:PlanProduct[],raw:unknown,rawDiet:unknown){
 const profile=parseBodyProfile(raw),diet=parseDiet(rawDiet);
 const energy=profile?calorieEstimate(profile):null;
 const exclusions=diet?.excluded??[];
 const filtered=products.filter(p=>{
  const text=`${p.name} ${p.avoidanceText??''}`;
  if(exclusions.length&&(p.avoidanceText===null||exclusions.some(key=>p.allergens?.includes(key)||excludedFoodAliases[key].some(word=>text.includes(word)))))return false;
  if(diet?.style==='plant'&&!/비건|vegan/i.test(text))return false;
  return true;
 });
 const result=filtered.map(p=>{
  const basis=p.nutritionBasis?.replaceAll(' ','').match(/^(?:가식부)?(\d+(?:\.\d+)?)g(?:당|기준)?$/);
  const factor=basis&&Number(basis[1])>0&&p.unit==='g'?p.quantity/p.servings/Number(basis[1]):null;
  const sourced=Boolean(p.nutritionSourceUrl||p.nutritionPhotoUrl);
  const kcal=sourced&&factor!==null&&p.caloriesKcal!=null?p.caloriesKcal*factor:null;
  const protein=sourced&&factor!==null&&p.proteinG!=null?p.proteinG*factor:null;
  const fit=energy&&kcal!==null?Math.max(-150,100-200*Math.abs(kcal-energy.perMeal)/energy.perMeal):0;
  const preference=diet?.style==='protein'&&protein!==null?Math.min(60,protein*2):diet?.style==='quick'&&p.category!=='meal_kit'?40:0;
  return {...p,personalizationScore:profile?.pregnancy?0:fit+preference,servingCalories:kcal===null?null:Math.round(kcal)};
 });
 return {products:result,personalization:{hasProfile:Boolean(profile),blocked:Boolean(profile?.pregnancy),dailyCalories:energy?.daily??null,perMealCalories:energy?.perMeal??null,meals:profile?.meals??null,style:diet?dietStyles[diet.style]:null,excluded:exclusions.map(key=>excludedFoods[key as ExcludedFood]),nutritionMatched:energy?result.filter(p=>p.servingCalories!==null).length:0}};
}
