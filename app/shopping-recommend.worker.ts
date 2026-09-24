import {shoppingBudgetGuide} from '../lib/shopping-budget';
import {recommendShopping,type PlanProduct,type PlanConditions} from '../lib/shopping-plan';
import type {TodayContext} from '../lib/today-context';
self.onmessage=(event:MessageEvent<{products:PlanProduct[];conditions:PlanConditions;previous:string[];seed?:number;today?:TodayContext|null}>)=>{
 try {
  const {products,conditions,previous,seed,today}=event.data;
  // 예산 안내(최저 구성 탐색, 약 3초)는 예산 상한이 있을 때만 필요하다.
  self.postMessage({guide:conditions.budget<1000000?shoppingBudgetGuide(products,conditions):null,next:recommendShopping(products,conditions,false,previous,seed,today)});
 }catch{self.postMessage({error:'추천을 계산하지 못했어요. 다시 시도해 주세요.'});}
};
