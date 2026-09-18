import {cookingDishId,mealSchedule,slotCandidates,type PlanConditions,type PlanProduct} from './shopping-plan';
import {shoppingGoals} from './shopping-goals';

// Count dishes that can actually occupy the requested slots, not ingredient variants.
function availableDishes(products:PlanProduct[],conditions:PlanConditions){
 const schedule=mealSchedule(conditions);
 const indices=schedule.map((_,i)=>i).filter(i=>schedule.findIndex(s=>s.slot===schedule[i].slot)===i);
 return new Set(indices.flatMap(i=>slotCandidates(products,conditions,i)).filter(p=>!p.recipe||!p.id.includes('--with--')).map(p=>cookingDishId(p.id))).size;
}

export function shoppingAvailabilityMessage(products:PlanProduct[],conditions:PlanConditions):string|null{
 const count=availableDishes(products,conditions);
 if(count>=conditions.meals)return null;
 if(conditions.goal&&conditions.goal!=='maintain'){
  const withoutGoal=availableDishes(products,{...conditions,goal:'maintain'});
  if(withoutGoal>count)return `${conditions.meals}끼를 서로 다른 메뉴로 준비해야 하는데, ‘${shoppingGoals[conditions.goal].label}’ 비교에 필요한 영양정보가 있는 메뉴는 ${count}개예요. 예산 부족이 아니에요. 식사 목표를 ‘균형 잡힌 식사’로 바꾸면 후보 ${withoutGoal}개를 확인할 수 있어요. 영양정보가 없는 메뉴는 목표에 맞는지 판단하지 않아요.`;
 }
 return `${conditions.meals}끼에 서로 다른 메뉴 ${conditions.meals}개가 필요하지만, 현재 조건에 맞는 메뉴는 ${count}개예요. 예산을 올려도 후보 수는 늘지 않아요. 기간·끼니 수를 줄이거나 음식 종류·먹는 방식·제외 재료를 확인해 주세요.`;
}
