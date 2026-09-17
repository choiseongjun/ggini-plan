import {servingNutrition} from './food-intake';
import type {PlanProduct} from './shopping-plan';

export const shoppingGoals = {
 maintain: {label:'체중 유지 · 골고루',description:'기존 필요 열량과 취향을 바탕으로 골고루 골라요.'},
 lose: {label:'체중 감량',description:'확인된 1회분 영양정보로 열량 대비 단백질이 많은 메뉴를 우선해요.'},
 muscle: {label:'근육 증가 · 운동',description:'확인된 1회분 단백질이 많은 메뉴를 우선해요.'},
} as const;
export type ShoppingGoal = keyof typeof shoppingGoals;
export const isShoppingGoal=(value:unknown):value is ShoppingGoal=>typeof value==='string'&&Object.hasOwn(shoppingGoals,value);

// Ranking weights, not prescribed nutrient intake or a calorie deficit/surplus.
// Both values must be sourced and comparable; missing nutrition earns no bonus.
export function goalBonus(product:PlanProduct,goal:ShoppingGoal='maintain'){
 if(goal==='maintain')return 0;
 const {calories,protein}=servingNutrition(product);
 if(calories===null||protein===null||!Number.isFinite(calories)||!Number.isFinite(protein)||calories<=0||protein<=0)return 0;
 return goal==='lose'?Math.min(100,protein/calories*1000):Math.min(100,protein*3);
}
export function productsForGoal(products:PlanProduct[],goal?:ShoppingGoal):PlanProduct[]{
 if(!goal||goal==='maintain')return products;
 return products.map(p=>({...p,personalizationScore:(p.personalizationScore??0)+goalBonus(p,goal)}));
}
