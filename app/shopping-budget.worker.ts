import {shoppingBudgetGuide} from '../lib/shopping-budget';
import type {PlanConditions,PlanProduct} from '../lib/shopping-plan';
self.onmessage=(event:MessageEvent<{products:PlanProduct[];conditions:PlanConditions}>)=>{
 try{self.postMessage({guide:shoppingBudgetGuide(event.data.products,event.data.conditions)});}
 catch{self.postMessage({error:true});}
};
