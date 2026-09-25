import type {PlanProduct} from './shopping-plan';
export const cookingEfforts={
 easy:{label:'간편하게',description:'간단한 손질·한 팬 요리 위주',time:'10~15분 정도'},
 everyday:{label:'가볍게 요리할래요',description:'볶음·국 등 기본 조리도 좋아요',time:'20~30분 정도'},
 relaxed:{label:'시간 들여 요리할래요',description:'손질·여러 조리 과정도 괜찮아요',time:'30분 이상도 OK'},
} as const;
export type CookingEffort=keyof typeof cookingEfforts;
export const isCookingEffort=(v:unknown):v is CookingEffort=>typeof v==='string'&&Object.hasOwn(cookingEfforts,v);
// Conservative preparation estimate, not a measured duration. Government templates
// have placeholder minutes/steps, so those values cannot prove a dish is easy.
export function recipeEffort(p:PlanProduct):CookingEffort{
 const r=p.recipe;if(!r||r.assembly)return p.category==='meal_kit'?'everyday':'easy';
 const name=p.name.replace(/_/g,' '),steps=r.steps.join(' ');
 const complex=/갈비찜|갈비탕|잡채|튀김|돈가스|돈까스|수육|보쌈|백숙|삼계탕|장조림|만두|김치찜|조기|아귀|아구|해물찜|생선찜/.test(name)
  ||/(?:생선|고등어|삼치|갈치|가자미|꽁치|우럭|도미|대구|명태|코다리).*(?:찜|조림|구이)/.test(name)
  ||/비늘|내장|핏물|반죽|튀기|튀겨/.test(steps);
 if(complex||r.minutes>30||r.ingredients.length>9||r.steps.length>6||(r.sideCount??0)>1)return 'relaxed';
 const inferred=p.id.startsWith('recipe-opt-');
 if(inferred)return /볶음밥|덮밥|비빔밥|샌드위치|토스트|오믈렛|스크램블|달걀국|계란국|두부구이/.test(name)&&r.ingredients.length<=6?'easy':'everyday';
 return r.minutes<=15&&r.ingredients.length<=6&&r.steps.length<=4&&!(r.sideCount)?'easy':'everyday';
}
export function allowsCookingEffort(p:PlanProduct,effort?:CookingEffort){
 if(!effort||effort==='relaxed')return true;
 const level=recipeEffort(p);return effort==='easy'?level==='easy':level!=='relaxed';
}
