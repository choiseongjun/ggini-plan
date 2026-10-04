import type {DailyNutritionReference} from './daily-nutrition-reference';

// 오늘 먹은 양과 하루 권장량으로 다음 끼니 방향을 한 문장으로 정한다.
export function nextMealHint(totals:{calories:number;protein:number},reference:NonNullable<DailyNutritionReference>){
 const kcalLeft=Math.round(reference.calories-totals.calories),proteinLeft=Math.round(reference.protein-totals.protein);
 if(kcalLeft<=150)return {kcalLeft,proteinLeft,hint:'오늘 열량은 거의 채웠어요. 다음은 가벼운 메뉴가 좋아요.'};
 // 먹은 열량 비중보다 단백질 비중이 15%p 넘게 뒤처지면 단백질을 우선한다.
 if(proteinLeft>=20&&totals.protein/reference.protein<totals.calories/reference.calories-0.15)return {kcalLeft,proteinLeft,hint:`단백질이 ${proteinLeft}g 남았어요. 다음 끼니는 단백질을 채우는 메뉴로 골라 드릴게요.`};
 return {kcalLeft,proteinLeft,hint:`남은 ${kcalLeft.toLocaleString('ko-KR')}kcal 안에서 다음 끼니를 골라 드릴게요.`};
}

