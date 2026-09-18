import {servingNutrition} from './food-intake';
import type {PlanProduct} from './shopping-plan';

export const shoppingGoals = {
 maintain: {label:'균형 잡힌 식사',description:'기존 필요 열량과 취향을 바탕으로 골고루 골라요.'},
 lose: {label:'다이어트',description:'확인된 1회분 영양정보로 열량 대비 단백질이 많은 메뉴를 우선해요.'},
 muscle: {label:'고단백',description:'확인된 1회분 단백질이 많은 메뉴를 우선해요.'},
 lowfat: {label:'저지방',description:'확인된 영양정보로 열량 대비 지방이 적은 메뉴를 우선해요.'},
} as const;
export type ShoppingGoal = keyof typeof shoppingGoals;
export const isShoppingGoal=(value:unknown):value is ShoppingGoal=>typeof value==='string'&&Object.hasOwn(shoppingGoals,value);

// Ranking weights, not prescribed nutrient intake or a calorie deficit/surplus.
// Both values must be sourced and comparable; missing nutrition earns no bonus.
export function goalBonus(product:PlanProduct,goal:ShoppingGoal='maintain'){
 if(goal==='maintain')return 0;
 const {calories,protein}=servingNutrition(product);
 if(goal==='lowfat'){const fat=servingFat(product);return calories!==null&&calories>0&&fat!==null?Math.max(0,100-fat*9/calories*100):0;}
 if(calories===null||protein===null||!Number.isFinite(calories)||!Number.isFinite(protein)||calories<=0||protein<=0)return 0;
 return goal==='lose'?Math.min(100,protein/calories*1000):Math.min(100,protein*3);
}
export function productsForGoal(products:PlanProduct[],goal?:ShoppingGoal):PlanProduct[]{
 if(!goal||goal==='maintain')return products;
 return products.map(p=>({...p,personalizationScore:(p.personalizationScore??0)+goalBonus(p,goal)}));
}

export function servingFat(p:PlanProduct):number|null{
 if(p.recipe){let sum=0;for(const i of p.recipe.ingredients){const fat=servingFat(i.product);if(fat===null)return null;sum+=fat*i.product.servings*i.packs;}return sum;}
 const basis=p.nutritionBasis?.replaceAll(' ','').match(/^(?:가식부)?(\d+(?:\.\d+)?)g(?:당|기준)?$/);
 const grams=p.servingGrams??(p.unit==='g'&&p.servings>0?p.quantity/p.servings:null);
 return (p.nutritionSourceUrl||p.nutritionPhotoUrl)&&basis&&Number(basis[1])>0&&grams!=null&&grams>0&&typeof p.fatG==='number'&&Number.isFinite(p.fatG)&&p.fatG>=0?p.fatG*grams/Number(basis[1]):null;
}
export function hasGoalNutrition(p:PlanProduct,goal?:ShoppingGoal){if(!goal||goal==='maintain')return true;const n=servingNutrition(p);return n.calories!==null&&n.calories>0&&(goal==='lowfat'?servingFat(p)!==null:n.protein!==null&&n.protein>0);}
export const budgetModes={save:{label:'최대한 아끼기',description:'조건에 맞는 저렴한 구성 우선'},balanced:{label:'적당히 쓰기',description:'가격·영양·다양성을 함께 고려'},full:{label:'예산 충분히 활용하기',description:'한도 안에서 다양성과 선택 폭 우선'}} as const;
export type BudgetMode=keyof typeof budgetModes;
export const isBudgetMode=(v:unknown):v is BudgetMode=>typeof v==='string'&&Object.hasOwn(budgetModes,v);
