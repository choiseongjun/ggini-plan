import {canonicalIngredient,isWater} from './ingredient-canonical';
import {isPantrySeasoning} from './pantry-recommendation';
import type {PlanProduct} from './shopping-plan';
export const ingredientGroups=['전체','채소·과일','단백질','밥·면','양념','기타'] as const;
export function pantryIngredientGroup(name:string){
 if(isPantrySeasoning(name))return '양념';
 if(/고기|닭|돼지|소고기|쇠고기|달걀|계란|두부|참치|새우|생선|연어|고등어|오징어|치즈|우유|콩|베이컨|햄/.test(name))return '단백질';
 if(/밥|쌀|면|국수|파스타|떡|빵|밀가루|오트|감자전분/.test(name))return '밥·면';
 if(/양파|^파$|마늘|배추|김치|감자|고구마|당근|호박|버섯|토마토|상추|시금치|오이|가지|브로콜리|양상추|고추|피망|파프리카|숙주|콩나물|사과|바나나|배$|레몬/.test(name))return '채소·과일';
 return '기타';
}
export function pantryIngredientIndex(products:PlanProduct[]){
 const counts=new Map<string,number>();
 for(const product of products){const names=new Set(product.recipe?.ingredients.map(i=>canonicalIngredient(i.product.name))??[]);for(const name of names){if(name&&!isWater(name)&&name.length<=30)counts.set(name,(counts.get(name)??0)+1);}}
 return [...counts].map(([name,recipeCount])=>({name,recipeCount,group:pantryIngredientGroup(name)})).sort((a,b)=>b.recipeCount-a.recipeCount||a.name.localeCompare(b.name,'ko'));
}
