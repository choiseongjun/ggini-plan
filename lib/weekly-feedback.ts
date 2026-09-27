import {weekStart} from './intake-stats';
import {cookingDishId,type PlanProduct} from './shopping-plan';
import {servingNutrients} from './serving-nutrients';
import type {MealSlot} from './meal-time';
export type FeedbackLog={date:string;name:string;productId:string;mealSlot:MealSlot|null;protein:number|null;sodium:number|null};
const normalizedName=(name:string)=>name.replace(/\s*\(사진 추정\)/g,'').trim();
export const wasRepeated=(p:Pick<PlanProduct,'id'|'name'>,repeated:string[])=>repeated.includes(cookingDishId(p.id))||repeated.includes(`name:${normalizedName(p.name)}`);
export const shiftDay=(day:string,n:number)=>new Date(Date.parse(`${day}T00:00:00Z`)+n*86400000).toISOString().slice(0,10);
export function feedbackDates(today:string){return {from:shiftDay(today,-6),to:today,nextStart:shiftDay(weekStart(today),7)};}
export function summarizeWeek(logs:FeedbackLog[],targets:{protein:number|null;sodium:number|null}){
 const days=[...new Set(logs.map(l=>l.date))];
 const completeDays=days.filter(day=>['breakfast','lunch','dinner'].every(slot=>logs.some(l=>l.date===day&&l.mealSlot===slot)));
 const average=(key:'protein'|'sodium')=>{const known=completeDays.filter(day=>logs.filter(l=>l.date===day).every(l=>l[key]!==null));return {days:known.length,value:known.length?Math.round(known.reduce((sum,day)=>sum+logs.filter(l=>l.date===day).reduce((s,l)=>s+l[key]!,0),0)/known.length):null};};
 const protein=average('protein'),sodium=average('sodium');
 const proteinFocus=protein.days>=3&&targets.protein!==null&&protein.value!<targets.protein;
 const sodiumFocus=sodium.days>=3&&targets.sodium!==null&&sodium.value!>targets.sodium;
 const counts=new Map<string,number>();for(const log of logs){const key=log.productId.startsWith('photo:')?`name:${normalizedName(log.name)}`:cookingDishId(log.productId);if(!key.startsWith('extra:'))counts.set(key,(counts.get(key)??0)+1);}
 const repeated=[...counts].filter(([,count])=>count>=2).map(([id])=>id);
 const points=[days.length?`최근 7일 중 ${days.length}일, 음식 ${logs.length}건을 기록했어요.`:'최근 7일 기록이 아직 없어요. 한 끼부터 남겨 보세요.'];
 if(proteinFocus)points.push(`세 끼를 모두 기록하고 단백질 정보가 있는 ${protein.days}일의 평균은 ${protein.value}g으로, 비교 목표 ${targets.protein}g보다 낮았어요. 다음 식단에서 단백질 메뉴를 우선 살펴볼게요.`);
 if(sodiumFocus)points.push(`세 끼를 모두 기록하고 나트륨 정보가 있는 ${sodium.days}일의 평균은 ${sodium.value}mg으로, 비교 기준 ${targets.sodium}mg보다 높았어요. 다음 식단에서 나트륨이 낮은 후보를 우선 살펴볼게요.`);
 if(repeated.length)points.push(`반복 기록한 음식이 ${repeated.length}종 있어요. 다음 식단에는 다른 메뉴를 우선 찾아볼게요.`);
 if(!proteinFocus&&!sodiumFocus)points.push(completeDays.length<3?'세 끼 기록이 있는 날이 아직 적어 영양 부족·과다를 판단하지 않아요. 기존 목표를 유지하며 메뉴를 다양하게 제안할게요.':'기존 영양 목표를 유지하면서 최근 기록과 다른 메뉴를 찾아볼게요.');
 return {days:days.length,count:logs.length,completeDays:completeDays.length,protein,sodium,proteinFocus,sodiumFocus,repeated,points};
}
export type WeeklyFeedback=ReturnType<typeof summarizeWeek>&ReturnType<typeof feedbackDates>;
export function feedbackProducts(products:PlanProduct[],report:ReturnType<typeof summarizeWeek>){return products.map(p=>{const n=servingNutrients(p);return {...p,personalizationScore:(p.personalizationScore??0)+(report.proteinFocus&&n.protein!==null?Math.min(60,n.protein*2):0)-(report.sodiumFocus&&n.sodium!==null?Math.min(60,n.sodium/30):0)-(wasRepeated(p,report.repeated)?100:0)};});}
export function compareWeeklyPlans(before:PlanProduct[],after:PlanProduct[]){
 const average=(items:PlanProduct[],key:'protein'|'sodium')=>{const values=items.map(p=>servingNutrients(p)[key]);return values.length&&values.every(v=>v!==null)?Math.round(values.reduce<number>((s,v)=>s+v!,0)/values.length*10)/10:null;};
 return {changed:after.filter((p,i)=>p.id!==before[i]?.id).length,protein:{before:average(before,'protein'),after:average(after,'protein')},sodium:{before:average(before,'sodium'),after:average(after,'sodium')}};
}
