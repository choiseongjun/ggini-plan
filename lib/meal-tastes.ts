// 추천 결과를 "탭으로 다듬기": 매운 거·국물·고기. 메뉴 특성(data/dish-traits.json)은 서버에서만 읽고
// 메뉴에 tasteTags로 붙여 점수에 반영한다(특성 데이터를 브라우저로 보내지 않는다).
export const mealTastes={spicy:'매운 거',soup:'국물 있는 거',meat:'고기 들어간 거'} as const;
export type MealTaste=keyof typeof mealTastes;
export const isMealTaste=(value:unknown):value is MealTaste=>typeof value==='string'&&Object.hasOwn(mealTastes,value);
export const validMealTastes=(value:unknown):value is MealTaste[]=>Array.isArray(value)&&value.length<=3&&new Set(value).size===value.length&&value.every(isMealTaste);

const MEAT=new Set(['pork','beef','chicken','duck']);
export function tasteTagsFor(traits:{spicy?:number;soupy?:boolean;main?:string}|undefined):MealTaste[]{
 if(!traits)return [];
 const tags:MealTaste[]=[];
 if((traits.spicy??0)>=1)tags.push('spicy');
 if(traits.soupy)tags.push('soup');
 if(traits.main&&MEAT.has(traits.main))tags.push('meat');
 return tags;
}
// 고른 맛 하나가 맞는 메뉴마다 더하는 점수: 영양 적합도(끼니당 최대 ±480)보다 크게 둬서 실제로 결과가 바뀌게 한다.
export const TASTE_BONUS=700;
