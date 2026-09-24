import {servingNutrition} from './food-intake';
import type {PlanProduct} from './shopping-plan';
import {nutritionIsEstimated,servingNutrients} from './serving-nutrients';

export const shoppingGoals = {
 maintain: {label:'균형 잡힌 식사',description:'필요 열량과 탄수화물·단백질·지방 구성을 함께 비교해요.'},
 lose: {label:'다이어트 식단',description:'한 끼 열량과 열량 대비 단백질을 함께 비교해요.'},
 muscle: {label:'헬스·고단백 식단',description:'한 끼 단백질 함량을 우선하고 열량 대비 구성도 살펴요.'},
 lowfat: {label:'저지방',description:'등록된 영양정보로 열량 대비 지방이 적은 메뉴를 우선해요.'},
 lowcarb: {label:'저탄고지',description:'탄수화물 비중이 낮고 지방 비중이 높은 메뉴를 우선 비교해요.'},
} as const;
export type ShoppingGoal = keyof typeof shoppingGoals;
export const isShoppingGoal=(value:unknown):value is ShoppingGoal=>typeof value==='string'&&Object.hasOwn(shoppingGoals,value);

// Ranking weights, not prescribed nutrient intake or a calorie deficit/surplus.
// Both values must be sourced and comparable; missing nutrition earns no bonus.
export function goalBonus(product:PlanProduct,goal:ShoppingGoal='maintain'){
 const {calories,protein,carbs,fat,sodium}=servingNutrients(product);
 const weight=nutritionIsEstimated(product)?0.55:1;
 // Soft ranking signals, not medical targets or prescribed nutrient intake.
 const sodiumPenalty=sodium!==null&&calories!==null&&calories>0?Math.min(20,sodium/calories*2):0;
 if(goal==='lowcarb'){
  if(calories===null||calories<=0||protein===null||carbs===null||fat===null)return 0;
  const macroEnergy=carbs*4+protein*4+fat*9;
  if(macroEnergy<=0)return 0;
  return (100*(1-carbs*4/macroEnergy)+40*fat*9/macroEnergy-sodiumPenalty)*weight;
 }
 if(goal==='lowfat')return calories!==null&&calories>0&&fat!==null?(Math.max(0,100-fat*9/calories*100)-sodiumPenalty)*weight:0;
 if(calories===null||protein===null||!Number.isFinite(calories)||!Number.isFinite(protein)||calories<=0||protein<=0)return 0;
 if(goal==='maintain'){
   const energy=carbs!==null&&fat!==null?[protein*4,carbs*4,fat*9]:null;
   const total=energy?.reduce((sum,n)=>sum+n,0)??0;
   const balance=energy&&total>0?30*(1-Math.max(...energy)/total):0;
   return (Math.min(60,protein/calories*800)+balance+(energy?10:0)-sodiumPenalty)*weight;
 }
 // Smooth scores distinguish portions above 33g protein instead of treating them all as equal.
 const density=100*(protein*4)/(calories+protein*4);
 const proteinAmount=100*protein/(protein+20);
 const moderateEnergy=100*400/(calories+400);
 return ((goal==='lose'?density*1.4+moderateEnergy*0.6:proteinAmount*1.4+density*0.3)-sodiumPenalty)*weight;
}
export function productsForGoal(products:PlanProduct[],goal?:ShoppingGoal):PlanProduct[]{
 return products.map(p=>({...p,personalizationScore:(p.personalizationScore??0)+goalBonus(p,goal)}));
}

export function servingFat(p:PlanProduct):number|null{
 return servingNutrients(p).fat;
}
// A bare "protein>0" floor let the soft goalBonus ranking carry all the weight for 'muscle' — fine when
// candidates vary widely in quality, but the govDB recipe pool clusters tightly enough (per-meal fit
// differences of ~50 points, dwarfed by unrelated variety/repetition terms) that a plain rice porridge
// or scorched-rice snack with a few grams of protein could still surface as a "고단백" pick (누룽지 4g,
// 흰죽 3g, 잔치국수 5.7g). 10g/serving is a low bar for a genuine protein source, not a prescribed
// target — just enough to rule those out without cutting into legitimately protein-bearing dishes.
const MUSCLE_MIN_PROTEIN_G = 10;
export function hasGoalNutrition(p:PlanProduct,goal?:ShoppingGoal){if(!goal||goal==='maintain')return true;if(goal==='lowcarb'){const n=servingNutrients(p);return n.calories!==null&&n.calories>0&&n.protein!==null&&n.protein>0&&n.carbs!==null&&n.fat!==null&&n.fat>0;}const n=servingNutrition(p);return n.calories!==null&&n.calories>0&&(goal==='lowfat'?servingFat(p)!==null:goal==='muscle'?n.protein!==null&&n.protein>=MUSCLE_MIN_PROTEIN_G:n.protein!==null&&n.protein>0);}
export const budgetModes={save:{label:'최대한 아끼기',description:'조건에 맞는 저렴한 구성 우선'},balanced:{label:'적당히 쓰기',description:'가격·영양·다양성을 함께 고려'},full:{label:'예산 충분히 활용하기',description:'한도 안에서 다양성과 선택 폭 우선'}} as const;
export type BudgetMode=keyof typeof budgetModes;
export const isBudgetMode=(v:unknown):v is BudgetMode=>typeof v==='string'&&Object.hasOwn(budgetModes,v);
