import {parseConditions,validMealIds,type PlanProduct,type PlanConditions} from '../../lib/shopping-plan';
export type Saved={conditions:PlanConditions;ids:string[];have:Record<string,number>};
export function parseSaved(raw:string|null,products:PlanProduct[]):Saved|null{
 try{const v=JSON.parse(raw??'null'),conditions=parseConditions(v?.conditions);if(!conditions||!Array.isArray(v.ids)||!validMealIds(v.ids,products,conditions)||!v.have||typeof v.have!=='object'||Array.isArray(v.have)||Object.values(v.have).some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>10000))return null;return {conditions,ids:v.ids,have:v.have};}catch{return null;}
}
