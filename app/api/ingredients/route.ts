import {getPool} from '../../../lib/db';
import {marketContext,RegionError} from '../../../lib/regional-db';
export const runtime='nodejs';
export async function GET(request:Request){
 try{
  const q=new URL(request.url).searchParams,region=await marketContext(q.get('market')??'KR',q.get('locale')??undefined);
  const rows=await getPool().query(`SELECT i.code,COALESCE(t.name,f.name,i.code) AS name,COALESCE(t.aliases,'{}') AS aliases,CASE WHEN t.name IS NULL THEN f.locale_code ELSE t.locale_code END AS locale FROM food_ingredients i LEFT JOIN ingredient_translations t ON t.ingredient_code=i.code AND t.locale_code=$1 LEFT JOIN ingredient_translations f ON f.ingredient_code=i.code AND f.locale_code='ko-KR' ORDER BY i.code`,[region.locale]);
  return Response.json({region,ingredients:rows.rows,notice:'Ingredient preferences are not a country-specific regulated allergen list.'},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof RegionError?e.message:'Ingredients unavailable'},{status:e instanceof RegionError?400:503});}
}
