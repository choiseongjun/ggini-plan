import type {PhotoMealItem} from './meal-draft';
import {validPortions} from './food-intake';
import {validEatenAt} from './meal-time';

export function photoReviewState(items:PhotoMealItem[],eatenAt:string|null){
 const issues:{id:string;message:string}[]=[];
 if(!items.length)issues.push({id:'foods',message:'먹은 음식을 하나 이상 추가해 주세요.'});
 for(const [index,item] of items.entries()){
  if(!item.name.trim())issues.push({id:`meal-name-${item.id}`,message:`음식 ${index+1}의 이름을 입력해 주세요.`});
  else if(!item.food)issues.push({id:`meal-name-${item.id}`,message:`${item.name}: 영양정보를 선택하거나 ‘영양 없이 기록’을 눌러 주세요.`});
  if(!validPortions(item.portions))issues.push({id:`meal-amount-${item.id}`,message:`음식 ${index+1}의 먹은 양을 0.25~10회 사이, 0.25 단위로 입력해 주세요.`});
 }
 if(!eatenAt||!validEatenAt(eatenAt))issues.push({id:'time',message:'식사 시간을 확인해 주세요. 미래 시간에는 기록할 수 없어요.'});
 const known=items.filter(item=>item.food?.kcal!=null&&validPortions(item.portions));
 return {issues,ready:issues.length===0,calories:known.length?Math.round(known.reduce((sum,item)=>sum+item.food!.kcal!*item.portions,0)):null,missing:items.length-known.length};
}
