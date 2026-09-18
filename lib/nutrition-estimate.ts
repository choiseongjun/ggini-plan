import {emptyNutrition,type ExtractedNutrition} from './nutrition-ocr';
import {readNutritionWithAI} from './nutrition-ai';
export const nutrientKeys=['caloriesKcal','proteinG','carbohydratesG','fatG','sodiumMg'] as const;
export function validKnownNutrition(value:unknown):ExtractedNutrition {
  if(!value||typeof value!=='object')return {...emptyNutrition};
  const v=value as Record<string,unknown>;
  const basis=typeof v.nutritionBasis==='string'?v.nutritionBasis.replace(/ · 추정 포함/g,'').trim():null;
  if(!basis||basis.length>80)return {...emptyNutrition};
  const result:ExtractedNutrition={...emptyNutrition,nutritionBasis:basis};
  for(const key of nutrientKeys){const n=v[key];if(typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100000)result[key]=n;}
  return result;
}
export function mergeNutritionEstimate(known:ExtractedNutrition,guessed:ExtractedNutrition){
  const fields=nutrientKeys.filter(key=>known[key]===null&&guessed[key]!==null);
  if(guessed.nutritionBasis!==known.nutritionBasis)return {extracted:known,fields:[]};
  return {extracted:{...guessed,...Object.fromEntries(nutrientKeys.filter(key=>known[key]!==null).map(key=>[key,known[key]]))},fields};
}
export async function estimateNutrition(name:string,detail:string,knownInput:unknown){
  const known=validKnownNutrition(knownInput);
  known.nutritionBasis??='100g당';
  const response=await readNutritionWithAI({estimation:true,text:JSON.stringify({product:name,description:detail,basis:known.nutritionBasis,known})});
  const {extracted,fields}=mergeNutritionEstimate(known,response.extracted);
  return {...response,extracted,estimate:fields.length?{fields,note:response.warning??response.text,model:response.model,estimatedAt:new Date().toISOString()}:null,warning:fields.length?'추정 영양정보입니다. 실제 제품·조리법에 따라 달라질 수 있습니다.':response.warning??'추정할 근거가 부족합니다.'};
}
