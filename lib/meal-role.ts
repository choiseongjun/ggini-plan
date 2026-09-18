import type {PlanProduct} from './shopping-plan';
export type MealRole='meal'|'pairing'|'side'|'ingredient';
export const mealRoleLabels={meal:'한 끼 식사',pairing:'곁들일 상품',side:'반찬·단백질',ingredient:'조리 재료'};
export function mealRole(p:PlanProduct):MealRole {
 if(p.recipe)return 'meal';
 const name=p.name.replace(/\[[^\]]*\]/g,'');
 if(/올리브유|참기름|식용유|치킨스톡|드레싱|사리|분말|가루|생지|볶음밥용|샌드위치용|김밥용/.test(name)||p.foodType==='sauce_oil')return 'ingredient';
 if(/도시락|볶음밥|덮밥|비빔밥|솥밥|김밥|주먹밥|샌드위치|버거|파스타|라자냐|리조또|비빔국수|쌀국수|칼국수|우동|냉면|피자|炒飯|燉飯|義大利麵/.test(name))return 'meal';
 if(['soup','chicken_breast','chicken_other','tofu','egg','side_dish','beef','pork','fish'].includes(p.foodType??'')||/닭가슴살|두부|계란|달걀|갈비탕|육개장|미역국|설렁탕|된장국|찌개|제육볶음/.test(name))return 'side';
 if(['rice','cereal','oats','milk','soy_milk','yogurt','bread','cheese','fruit','nuts','protein_drink','protein_snack','snack','drink'].includes(p.foodType??'')||/시리얼|그래놀라|콘푸라이트|콘푸로스트|우유|두유|요거트|식빵|현미밥|즉석밥|햇반/.test(name))return 'pairing';
 return p.category==='ingredient'?'ingredient':'meal';
}
