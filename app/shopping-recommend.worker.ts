import {shoppingBudgetGuide} from '../lib/shopping-budget';
import {recommendShopping,type PlanProduct,type PlanConditions} from '../lib/shopping-plan';
self.onmessage=(event:MessageEvent<{products:PlanProduct[];conditions:PlanConditions;previous:string[]}>)=>{
 try {
  const {products,conditions,previous}=event.data;
  self.postMessage({guide:shoppingBudgetGuide(products,conditions),next:recommendShopping(products,conditions,false,previous)});
 }catch{self.postMessage({error:'추천을 계산하지 못했어요. 다시 시도해 주세요.'});}
};
