import type {PlanProduct} from './shopping-plan';
export const mealKinds={rice:{label:'밥류',description:'볶음밥·덮밥·도시락·죽',emoji:'🍚'},noodles:{label:'면류',description:'국수·우동·파스타',emoji:'🍜'},bread:{label:'빵류',description:'샌드위치·토스트·베이글',emoji:'🍞'},light:{label:'가벼운 식사',description:'샐러드·시리얼·요거트',emoji:'🥗'},yogurt:{label:'요거트',description:'그릭요거트·요거트볼',emoji:'🥣'}} as const;
export type MealKind=keyof typeof mealKinds;
export function validMealKinds(value:unknown):value is MealKind[]{return Array.isArray(value)&&value.length<=Object.keys(mealKinds).length&&new Set(value).size===value.length&&value.every(k=>typeof k==='string'&&Object.hasOwn(mealKinds,k));}
export function mealKind(p:Pick<PlanProduct,'name'|'foodType'|'recipe'>):MealKind|null{
 const name=p.name.replace(/\[[^\]]*\]/g,'')+' '+(p.recipe?.family??'');
 if(!/샐러드|파스타|소스|드레싱/.test(name)&&(/요거트|요구르트/.test(name)||p.foodType==='yogurt'))return 'yogurt';
 if(/샐러드|시리얼|그래놀라|오트밀|요거트|요구르트/.test(name))return 'light';
 if(/샌드위치|토스트|베이글|식빵|모닝빵|잠봉뵈르|햄버거|크루아상|크로와상/.test(name))return 'bread';
 if(/파스타|스파게티|라자냐|국수|우동|라면|라멘|냉면|쫄면|짜장면|짬뽕|볶음면|메밀면|소바|수제비|뇨끼/.test(name))return 'noodles';
 if(/밥|도시락|리조또|리소토|(?:전복|야채|채소|단호박|소고기|닭|참치|흑임자|버섯)죽|죽$/.test(name.trim()))return 'rice';
 return ({rice:'rice',fried_rice:'rice',lunch_box:'rice',noodles:'noodles',bread:'bread',sandwich:'bread',salad:'light',cereal:'light',oats:'light',yogurt:'light'} as Record<string,MealKind>)[p.foodType??'']??null;
}
export function allowsMealKind(p:PlanProduct,selected?:MealKind[]){const kind=mealKind(p);return !selected?.length||selected.includes(kind as MealKind)||(kind==='yogurt'&&selected.includes('light'));}
