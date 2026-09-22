import {NextRequest} from 'next/server';
import {adminUser} from '../../../../lib/admin';
import {getCookedDish} from '../../../../lib/foodsafety-resolve';
import {synthesizeRecipeIngredients,saveSynthesizedDraft,approveSynthesizedRecipe,listSynthesizedRecipes} from '../../../../lib/foodsafety-recipe-synthesis';
import {ingredientRoles} from '../../../../lib/cooking-ingredient-pool';
import {NutritionAIError} from '../../../../lib/nutrition-ai';
export const maxDuration=30;

export async function GET(request:NextRequest){
 if(!await adminUser(request))return Response.json({error:'관리자 권한이 필요해요.'},{status:403});
 const status=request.nextUrl.searchParams.get('status');
 const recipes=await listSynthesizedRecipes(status==='draft'||status==='approved'?status:undefined);
 return Response.json({recipes},{headers:{'Cache-Control':'no-store'}});
}

export async function POST(r:NextRequest){
 if(r.headers.get('origin')!==new URL(r.url).origin||!await adminUser(r))return Response.json({error:'관리자 권한이 필요해요.'},{status:403});
 let foodCode='';
 try{const raw=await r.text();if(raw.length>200)throw new Error();const body=JSON.parse(raw);if(typeof body.foodCode!=='string'||!body.foodCode.trim())throw new Error();foodCode=body.foodCode.trim();}
 catch{return Response.json({error:'식품코드를 확인해 주세요.'},{status:400});}
 try{
  const dish=await getCookedDish(foodCode);
  if(!dish)return Response.json({error:'해당 식품을 찾을 수 없어요.'},{status:404});
  const proposal=await synthesizeRecipeIngredients(dish);
  await saveSynthesizedDraft(proposal);
  return Response.json({...proposal,status:'draft'},{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  if(e instanceof NutritionAIError)return Response.json({error:e.message},{status:502});
  console.error('Recipe synthesis failed',e);
  return Response.json({error:'재료 구성 제안을 만들지 못했어요.'},{status:503});
 }
}

export async function PUT(r:NextRequest){
 if(r.headers.get('origin')!==new URL(r.url).origin)return Response.json({error:'요청 출처가 올바르지 않아요.'},{status:403});
 const user=await adminUser(r);
 if(!user)return Response.json({error:'관리자 권한이 필요해요.'},{status:403});
 try{
  const raw=await r.text();if(raw.length>2000)throw new Error();
  const body=JSON.parse(raw);
  const roleKeys=Object.keys(ingredientRoles);
  if(typeof body.foodCode!=='string'||!body.foodCode.trim()||!Array.isArray(body.roles)||!body.roles.length||body.roles.length>5||
     body.roles.some((ing:unknown)=>!ing||typeof ing!=='object'||!roleKeys.includes(String((ing as {role?:unknown}).role))||typeof (ing as {grams?:unknown}).grams!=='number'||(ing as {grams:number}).grams<=0||(ing as {grams:number}).grams>2000))
   return Response.json({error:'재료 구성을 확인해 주세요.'},{status:400});
  await approveSynthesizedRecipe(body.foodCode.trim(),body.roles,user.id);
  return Response.json({saved:true},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'승인 처리에 실패했어요.'},{status:400});}
}
