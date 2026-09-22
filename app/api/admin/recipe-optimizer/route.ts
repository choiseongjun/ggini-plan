import {NextRequest} from 'next/server';
import {adminUser} from '../../../../lib/admin';
import {getCookedDish} from '../../../../lib/foodsafety-resolve';
import {recipeTemplates,templateForDishName,ingredientMap} from '../../../../lib/recipe-ingredient-data';
import {RandomSearchOptimizer,type FoodNutrition} from '../../../../lib/recipe-optimizer';
import {saveRecipeOptimizerResult,listRecipeOptimizerResults} from '../../../../lib/recipe-optimizer-store';
import {generateAllEligibleRecipes} from '../../../../lib/recipe-optimizer-batch';
export const maxDuration=60;

export async function GET(request:NextRequest){
 if(!await adminUser(request))return Response.json({error:'관리자 권한이 필요해요.'},{status:403});
 const results=await listRecipeOptimizerResults();
 return Response.json({templates:recipeTemplates.map(t=>({id:t.id,name:t.name,groups:t.groups})),results},{headers:{'Cache-Control':'no-store'}});
}

export async function POST(r:NextRequest){
 if(r.headers.get('origin')!==new URL(r.url).origin||!await adminUser(r))return Response.json({error:'관리자 권한이 필요해요.'},{status:403});
 let body:{foodCode?:string;templateId?:string};
 try{const raw=await r.text();if(raw.length>500)throw new Error();body=JSON.parse(raw);if(typeof body.foodCode!=='string'||!body.foodCode.trim())throw new Error();}
 catch{return Response.json({error:'대상 식품을 확인해 주세요.'},{status:400});}
 try{
  const dish=await getCookedDish(body.foodCode.trim());
  if(!dish)return Response.json({error:'해당 식품을 찾을 수 없어요.'},{status:404});
  if(dish.basisAmount!=='100g')return Response.json({error:'ml 기준 식품은 g 기준과 단위가 달라 목표로 쓸 수 없어요. 100g 기준 식품을 선택해 주세요.'},{status:400});
  if(dish.caloriesKcal===null||dish.proteinG===null||dish.fatG===null||dish.carbohydratesG===null||dish.sugarG===null||dish.sodiumMg===null)
   return Response.json({error:'이 식품은 영양값이 일부 비어 있어 목표로 쓸 수 없어요.'},{status:400});
  const template=(body.templateId?recipeTemplates.find(t=>t.id===body.templateId):null)??templateForDishName(dish.itemName);
  if(!template)return Response.json({error:'이 음식에 맞는 재료 구성 템플릿이 아직 없어요. 템플릿을 먼저 만들어야 해요.'},{status:404});
  const target:FoodNutrition={name:dish.itemName,basisAmount:dish.basisAmount,per100g:{kcal:dish.caloriesKcal,carbohydrate:dish.carbohydratesG,protein:dish.proteinG,fat:dish.fatG,sugar:dish.sugarG,sodium:dish.sodiumMg}};
  const optimizer=new RandomSearchOptimizer();
  const recipe=optimizer.optimize(target,template,ingredientMap());
  await saveRecipeOptimizerResult(dish.foodCode,recipe);
  return Response.json({recipe},{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  console.error('Recipe optimizer failed',e);
  return Response.json({error:'레시피 생성에 실패했어요.'},{status:503});
 }
}

export async function PUT(r:NextRequest){
 if(r.headers.get('origin')!==new URL(r.url).origin||!await adminUser(r))return Response.json({error:'관리자 권한이 필요해요.'},{status:403});
 try{
  const summary=await generateAllEligibleRecipes();
  return Response.json(summary,{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  console.error('Batch recipe generation failed',e);
  return Response.json({error:'일괄 생성에 실패했어요.'},{status:503});
 }
}
