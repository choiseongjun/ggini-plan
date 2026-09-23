import {mealKind,mealKinds} from './meal-kinds';
import {servingNutrition} from './food-intake';
import {goalBonus} from './shopping-goals';
import {nutritionIsEstimated} from './serving-nutrients';
import {purchaseBasket,type PlanConditions,type PlanProduct} from './shopping-plan';
export function recommendationReasons(p:PlanProduct,c:PlanConditions,target:number|null){
 const reasons:string[]=[];
 if(nutritionIsEstimated(p))reasons.push('추정 영양정보 포함 · 추천 반영 비중을 낮췄어요');
 const kind=mealKind(p);if(c.mealKinds?.length&&kind&&c.mealKinds.includes(kind))reasons.push(`선택한 ${mealKinds[kind].label} 메뉴예요`);
 const n=servingNutrition(p);
 if(target&&n.calories!==null&&Math.abs(n.calories-target)/target<=0.2)reasons.push(`한 끼 참고 열량 ${Math.round(target)} kcal에 가까워요`);
 if(goalBonus(p,c.goal)>0)reasons.push(c.goal==='lowcarb'?'탄수화물·지방의 에너지 비중을 비교한 구성':c.goal==='lose'?'열량 대비 단백질을 고려한 구성':c.goal==='lowfat'?'열량 대비 지방을 비교한 구성':c.goal==='muscle'?'1회분 단백질을 고려한 구성':'열량·단백질과 영양 구성을 비교한 구성');
 else if(c.cooking==='quick'&&p.category!=='meal_kit')reasons.push('선택한 간편 조리 조건에 맞아요');
 else if(c.cooking==='kit'&&p.category==='meal_kit')reasons.push('밀키트 조리 조건에 맞아요');
 if(c.owned.includes(p.id)||(c.supply?.[p.id]??0)>0)reasons.push('등록한 주문·보유 수량을 먼저 활용해요');
 if(!reasons.length)reasons.push('선택한 끼니·먹는 방식의 추천 후보예요');
 return reasons.slice(0,3);
}
export function purchaseSummary(rows:ReturnType<typeof purchaseBasket>){
 const groups=new Map<string,{seller:string;cost:number;packs:number;items:number}>();
 let unknown=0;
 for(const r of rows.filter(r=>r.packs>0)){
  let seller:string;try{const url=new URL(r.product.productUrl??'');if(url.protocol!=='https:')throw new Error();seller=url.hostname.replace(/^www\./,'');}catch{unknown++;seller='판매처 미확인';}
  const group=groups.get(seller)??{seller,cost:0,packs:0,items:0};group.cost+=r.cost;group.packs+=r.packs;group.items++;groups.set(seller,group);
 }
 return {groups:[...groups.values()],unknown,total:rows.reduce((n,r)=>n+r.cost,0),packs:rows.reduce((n,r)=>n+r.packs,0)};
}
