import type {PlanConditions} from './shopping-plan';
// Keep only shopping context; never include body measurements, exclusions or account data.
export function recommendationFeedbackMessage(conditions:PlanConditions,mealNames:string[],note:string){
 const unique=[...new Set(mealNames)];
 const summary=unique.slice(0,8).map(name=>name.replace(/[\r\n]/g,' ').slice(0,55)).join(' / ');
 return [
  '[추천 평가]',
  '예산 '+conditions.budget.toLocaleString('ko-KR')+'원 · '+conditions.meals+'끼',
  '추천 메뉴: '+summary+(unique.length>8?' 외 '+(unique.length-8)+'종':''),
  note.trim()?'사용자 의견: '+note.trim().slice(0,300):'',
 ].filter(Boolean).join('\n').slice(0,1000);
}
