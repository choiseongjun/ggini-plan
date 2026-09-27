import type {PlanProduct} from './shopping-plan';
import {recipeEffort} from './cooking-effort';
import {servingNutrients} from './serving-nutrients';

const ingredients: [string,RegExp][] = [
 ['두부',/두부/],['달걀',/달걀|계란|에그/],['닭고기',/닭|치킨/],
 ['돼지고기',/돼지|제육|돈육|삼겹|목살/],['소고기',/소고기|쇠고기|소불고기|한우|비프/],
 ['새우',/새우|쉬림프/],['오징어',/오징어/],['고등어',/고등어/],['연어',/연어/],
 ['참치',/참치/],['버섯',/버섯/],['감자',/(?<!고구)감자/],['가지',/가지/],
];
const styles = /볶음밥|비빔밥|덮밥|샌드위치|파스타|국수|찌개|조림|구이|볶음|찜|죽/;

// Explain observable similarities, not a predicted taste or health benefit.
export function mealSimilarity(current:PlanProduct,candidate:PlanProduct){
 const a=current.name.split(' + ')[0],b=candidate.name.split(' + ')[0];
 const reasons:string[]=[];let score=0;
 const shared=ingredients.find(([,pattern])=>pattern.test(a)&&pattern.test(b));
 if(shared){score+=100;reasons.push(`${shared[0]}를 활용한 다른 메뉴`);}
 const style=a.match(styles)?.[0];
 if(style&&style===b.match(styles)?.[0]){score+=55;reasons.push(`같은 ${style} 종류`);}
 if(current.recipe&&candidate.recipe&&recipeEffort(current)===recipeEffort(candidate)){
  score+=20;reasons.push('비슷한 조리 부담');
 }
 const an=servingNutrients(current),bn=servingNutrients(candidate);
 const close=(x:number|null,y:number|null)=>x!==null&&y!==null&&x>0&&y>0&&Math.abs(x-y)/x<=0.2;
 if(close(an.calories,bn.calories)&&close(an.protein,bn.protein)){
  score+=35;reasons.push('열량·단백질이 비슷해요');
 }
 return {score,reasons:reasons.length?reasons.slice(0,2):['현재 식단 조건에 맞는 대안']};
}
