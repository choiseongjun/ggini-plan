import {catalogItems} from '../../../../lib/catalog-db';
import {marketContext} from '../../../../lib/regional-db';
import {getPool} from '../../../../lib/db';
import {taiwanProductsOnly,type TaiwanProduct} from '../../../../lib/taiwan-plan';
import {servingNutrition} from '../../../../lib/food-intake';
import type {PlanProduct} from '../../../../lib/shopping-plan';
export const runtime='nodejs';
export async function GET(){
 try{
  const region=await marketContext('TW','zh-TW');
  const items=await catalogItems(region);
  const profiles=await getPool().query<{product_id:string;servings:string;meal_slots:TaiwanProduct['slots']}>(`SELECT p.product_id,p.servings,p.meal_slots FROM catalog_serving_profiles p JOIN catalog_items c ON c.id=p.product_id WHERE c.market_code='TW' AND c.currency_code='TWD'`);
  const products=taiwanProductsOnly(items.flatMap(p=>{const profile=profiles.rows.find(s=>s.product_id===p.id);return profile?[{...p,servings:Number(profile.servings),slots:profile.meal_slots}]:[]}));
  const planned:PlanProduct[]=products.map(p=>({...p,mealSlots:p.slots,servingGrams:p.quantity/p.servings,servingNote:`${p.quantity/p.servings}g／份`,avoidanceText:null}));
  return Response.json({region,products:planned.map(p=>({...p,servingCalories:servingNutrition(p).calories})),excluded:[],personalization:null},{headers:{'Cache-Control':'no-store'}});
 }catch(error){console.error('Taiwan catalog failed',error);return Response.json({error:'暫時無法載入商品，請稍後再試。'},{status:503});}
}
