import {basketTotal,mealSchedule,recommendShopping,slotCandidates,MAX_PLAN_MEALS,type PlanConditions,type PlanProduct} from './shopping-plan';

// Exact minimum purchase cost: allocate breakfast/main portions across products,
// charging complete selling packs once per product (including available stock).
export function minimumShoppingCost(products:PlanProduct[],c:PlanConditions,reduceRepeats=false):number|null{
 if(c.meals<1||c.meals>MAX_PLAN_MEALS||c.slots?.length===0)return null;
 const schedule=mealSchedule(c),breakfast=schedule.filter(s=>s.slot==='breakfast').length,main=c.meals-breakfast;
 const breakfastIds=new Set(breakfast?slotCandidates(products,c,schedule.findIndex(s=>s.slot==='breakfast')).map(p=>p.id):[]);
 const mainIds=new Set(main?slotCandidates(products,c,schedule.findIndex(s=>s.slot!=='breakfast')).map(p=>p.id):[]);
 const pool=products.filter(p=>breakfastIds.has(p.id)||mainIds.has(p.id));
 if((breakfast&&!breakfastIds.size)||(main&&!mainIds.size)||!pool.length)return null;
 if(reduceRepeats&&c.meals>1&&pool.length<2)return null;
 const width=main+1,size=(breakfast+1)*width;
 let dp=Array<number>(size).fill(Infinity);dp[0]=0;
 for(const p of pool){
  const limit=reduceRepeats?Math.max(Math.ceil(c.meals/Math.min(7,pool.length)),breakfastIds.has(p.id)?Math.ceil(breakfast/breakfastIds.size):0,mainIds.has(p.id)?Math.ceil(main/mainIds.size):0):c.meals;
  const options:{b:number;m:number;cost:number}[]=[];
  for(let b=0;b<=(breakfastIds.has(p.id)?breakfast:0);b++)for(let m=0;m<=(mainIds.has(p.id)?main:0);m++){
   if(b+m>limit)continue;
   const cost=c.owned.includes(p.id)?0:Math.ceil(Math.max(0,(b+m)/p.servings-(c.supply?.[p.id]??0)-0.000001))*p.price;
   options.push({b,m,cost});
  }
  const next=Array<number>(size).fill(Infinity);
  for(let b=0;b<=breakfast;b++)for(let m=0;m<=main;m++){
   const current=dp[b*width+m];if(!Number.isFinite(current))continue;
   for(const option of options){if(b+option.b>breakfast||m+option.m>main)continue;const index=(b+option.b)*width+m+option.m;next[index]=Math.min(next[index],current+option.cost);}
  }
  dp=next;
 }
 return Number.isFinite(dp[size-1])?dp[size-1]:null;
}
export function shoppingBudgetGuide(products:PlanProduct[],c:PlanConditions){
 products=products.filter(p=>!p.recipe||!p.id.includes('--with--'));
 const schedule=mealSchedule(c);
 const slots=[...new Set(schedule.map(s=>s.slot))];
 const options=slots.map(slot=>({slot,products:slotCandidates(products,c,schedule.findIndex(s=>s.slot===slot))}));
 const count=new Set(options.flatMap(o=>o.products.map(p=>p.id))).size;
 if(options.some(o=>o.products.some(p=>p.recipe))){
  const low=recommendShopping(products,{...c,budget:1000000},true),varied=count>1?recommendShopping(products,{...c,budget:1000000}):null;
  const minimum=low?basketTotal(low,products,c.owned,c.supply):null,varietyMinimum=varied?basketTotal(varied,products,c.owned,c.supply):null;
  return {count,minimum,varietyMinimum,varietyUpper:varietyMinimum,approximate:true,options:options.map(o=>({slot:o.slot,count:o.products.length}))};
 }
 const minimum=minimumShoppingCost(products,c),varietyMinimum=minimumShoppingCost(products,c,true);
 const varied=count>1&&varietyMinimum!==null?recommendShopping(products,{...c,budget:1000000}):null;
 const varietyUpper=varied?Math.max(varietyMinimum!,basketTotal(varied,products,c.owned,c.supply)):varietyMinimum;
 return {count,minimum,varietyMinimum,varietyUpper,approximate:false,options:options.map(o=>({slot:o.slot,count:o.products.length}))};
}
