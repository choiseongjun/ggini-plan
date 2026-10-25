import type {PlanProduct} from './shopping-plan';
import {getDetailedNutritionBatch} from './kfind-nutrition';
import {nutritionScale} from './detailed-nutrition';
import {officialMealMacros,type OfficialMealPart} from './official-meal-nutrition';

// Explicit cooked-rice reference, verified in the imported K-FCDB (100g basis).
export const COOKED_RICE_CODE='D301-022000000-0001';
export async function withKfindNutrition(mains:PlanProduct[],sides:PlanProduct[]){
 const all=[...mains,...sides];
 const codeOf=(p:PlanProduct)=>p.id.replace(/^recipe-opt-/,'');
 const sources=await getDetailedNutritionBatch([...all.map(codeOf),COOKED_RICE_CODE]);
 const convert=(p:PlanProduct,side:boolean):PlanProduct=>{
  const code=codeOf(p),reference=sources.get(code)??null;
  // Use source food weight, never the weight of AI-generated raw ingredients.
  const amount=side&&reference?.basis?.unit==='g'?{value:80,unit:'g' as const}:reference?.serving&&nutritionScale(reference.basis,reference.serving)!==null?reference.serving:reference?.basis??null;
  const parts:OfficialMealPart[]=[{role:side?'side':'main',name:reference?.name??p.name,code,amount,reference}];
  if(p.recipe?.ingredients.some(i=>i.label.startsWith('함께 먹는 밥'))){
   parts.push({role:'rice',name:'쌀밥',code:COOKED_RICE_CODE,amount:{value:210,unit:'g'},reference:sources.get(COOKED_RICE_CODE)??null});
  }
  const officialNutrition={parts},n=officialMealMacros(officialNutrition);
  return {...p,officialNutrition,servingGrams:parts.every(x=>x.amount?.unit==='g')?parts.reduce((sum,x)=>sum+x.amount!.value,0):undefined,
   protein:'K-FCDB 기준량 환산',nutritionEstimate:null,nutritionSourceName:'식품영양성분 데이터베이스 (K-FCDB)',nutritionSourceUrl:'https://various.foodsafetykorea.go.kr/nutrient/general/site/Info.do',
   servingNote:parts.map(x=>`${x.name} ${x.amount?`${x.amount.value}${x.amount.unit}`:'분량 미확인'}`).join(' + '),
   detail:'K-FCDB 음식 기준량으로 계산한 참고 영양정보 · 조리 재료와 가격은 별도의 추정 안내이며 원본 음식의 공식 레시피가 아니에요.',
   ...(p.recipe?{recipe:{...p.recipe,nutrition:{calories:n.calories,protein:n.protein}}}:{}),
  };
 };
 return {mains:mains.map(p=>convert(p,false)),sides:sides.map(p=>convert(p,true))};
}
