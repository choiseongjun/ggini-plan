import {cachedRecommendationProducts} from '../../../../lib/recommendation-catalog-cache';
import {pantryIngredientIndex,ingredientGroups} from '../../../../lib/pantry-ingredient-browser';
import {canonicalIngredient} from '../../../../lib/ingredient-canonical';
export const runtime='nodejs';
export async function GET(request:Request){
 const params=new URL(request.url).searchParams;
 const query=(params.get('q')??'').trim().slice(0,50),group=params.get('group')??'전체';
 if(!ingredientGroups.includes(group as typeof ingredientGroups[number]))return Response.json({error:'재료 분류를 확인해 주세요.'},{status:400});
 try{
  const all=pantryIngredientIndex(await cachedRecommendationProducts());
  const search=canonicalIngredient(query)||query;
  const found=all.filter(i=>(group==='전체'||i.group===group)&&(!query||i.name.includes(search)||(i.name==='달걀'?'계란':i.name).includes(query.replace(/\s/g,''))));
  return Response.json({items:found.slice(0,80),total:found.length,hasMore:found.length>80},{headers:{'Cache-Control':'private, max-age=60'}});
 }catch{return Response.json({error:'재료 목록을 불러오지 못했어요. 직접 입력하거나 사진으로 추가할 수 있어요.'},{status:503});}
}
