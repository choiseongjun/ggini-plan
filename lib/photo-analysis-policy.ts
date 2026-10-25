function limit(value:string|undefined,fallback:number,max:number){const n=Number(value);return value&&Number.isSafeInteger(n)&&n>0&&n<=max?n:fallback;}
export function photoAnalysisPolicy(env:Record<string,string|undefined>=process.env){
 const monthly=limit(env.PHOTO_ANALYSIS_MONTHLY_LIMIT,1200,100000);
 const reserve=Number(env.PHOTO_ANALYSIS_RESERVED_COST_KRW),budget=Number(env.PHOTO_ANALYSIS_MONTHLY_BUDGET_KRW);
 return {personal:limit(env.PHOTO_ANALYSIS_PERSONAL_DAILY_LIMIT,5,30),daily:limit(env.PHOTO_ANALYSIS_DAILY_LIMIT,40,10000),minute:limit(env.PHOTO_ANALYSIS_PER_MINUTE_LIMIT,2,100),monthly:Number.isFinite(reserve)&&reserve>0&&Number.isFinite(budget)&&budget>0?Math.min(monthly,Math.floor(budget/reserve)):monthly};
}
