import {recommendShopping,swapMeal} from '../../lib/shopping-plan';
import {shoppingBudgetGuide} from '../../lib/shopping-budget';
self.onmessage=({data})=>{try{const ids=data.index===undefined?recommendShopping(data.products,data.conditions):swapMeal(data.ids,data.index,data.products,data.conditions);self.postMessage({ids,guide:ids?null:shoppingBudgetGuide(data.products,data.conditions)});}catch{self.postMessage({error:'추천을 준비하지 못했어요. 조건을 바꿔 다시 시도해 주세요.'});}};
