export function recordedNutrientSummary(logs:readonly Record<string,unknown>[],key:string){
 const known=logs.filter(log=>typeof log[key]==='number'&&Number.isFinite(log[key]));
 return {total:known.length?known.reduce((sum,log)=>sum+(log[key] as number),0):null,missing:logs.length-known.length};
}
