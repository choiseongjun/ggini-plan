/** A comparison of estimates, never a claim of realized savings. */
export function compareMealCost(cost:number,usualCost:number){
 if(!Number.isFinite(cost)||cost<=0||!Number.isFinite(usualCost)||usualCost<=0||usualCost>1000000)return null;
 return Math.round(usualCost-cost);
}
