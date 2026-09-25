import reviews from '../data/menu-quality-review.json';
type Ingredient = {name:string; grams:number};
export type MenuQuality = {action:'keep'|'rename'|'hold'|'pending'; name:string; originalName:string; reason:string};
type Review = MenuQuality & {ingredients:Ingredient[]; model:string};
export function reviewMatches(review:{originalName:string;ingredients:Ingredient[]}, name:string, ingredients:Ingredient[]) {
 return review.originalName===name && JSON.stringify(review.ingredients)===JSON.stringify(ingredients.map(i=>({name:i.name,grams:i.grams})));
}
export function menuQuality(code:string, name:string, ingredients:Ingredient[]):MenuQuality {
 const review=(reviews as Record<string,Review>)[code];
 if(!review || !reviewMatches(review,name,ingredients)) return {action:'pending',name,originalName:name,reason:'메뉴·재료 검수 대기'};
 return {action:review.action,name:review.name,originalName:review.originalName,reason:review.reason};
}
export function qualityAllowsRecommendation(quality:MenuQuality) {return quality.action==='keep'||quality.action==='rename';}
