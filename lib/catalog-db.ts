import { type CatalogCategory, type CatalogItem } from "./catalog";
import { getPool } from "./db";
import {korea,type MarketContext} from './regional';

type CatalogRow = {
  market_code:string;currency_code:string;source_locale:string;translated_locale:string|null;
  allergy_info: CatalogItem['allergyInfo'];
  food_type: CatalogItem["foodType"];
  category: CatalogCategory; in_weekly_cart: boolean;
  product_image_url: string | null;
  unit: "g" | "개"; emoji: string; color: string; price_checked_at: Date | null; price_note: string | null; allergens: string[];
  id: string; name: string; detail: string; price: number; portions: string;
  quantity: string; search_query: string; product_url: string | null;
  nutrition_source_name: string | null; nutrition_source_url: string | null;
  has_photo: boolean; nutrition_photo_url: string | null;
  nutrition_basis: string | null; calories_kcal: string | null;
  protein_g: string | null; carbohydrates_g: string | null; fat_g: string | null;
  sodium_mg: string | null; created_at: Date | null; updated_at: Date;
};

export async function catalogItems(context:MarketContext=korea): Promise<CatalogItem[]> {
  const result = await getPool().query<CatalogRow>(`SELECT c.id,c.market_code,c.currency_code,c.source_locale,c.food_type,c.category,c.in_weekly_cart,c.product_image_url,c.unit,c.emoji,c.color,c.price_checked_at,c.price_note,c.allergens,c.price,c.quantity,c.product_url,c.allergy_info,c.nutrition_source_name,c.nutrition_source_url,c.nutrition_basis,c.calories_kcal,c.protein_g,c.carbohydrates_g,c.fat_g,c.sodium_mg,c.created_at,c.updated_at,c.nutrition_photo_url,c.nutrition_photo IS NOT NULL AS has_photo,
    COALESCE(t.name,c.name) AS name,COALESCE(t.detail,c.detail) AS detail,COALESCE(t.portions,c.portions) AS portions,COALESCE(t.search_query,c.search_query) AS search_query,t.locale_code AS translated_locale
    FROM catalog_items c LEFT JOIN catalog_translations t ON t.product_id=c.id AND t.locale_code=$3
    WHERE c.market_code=$1 AND c.currency_code=$2 ORDER BY c.id`,[context.market,context.currency,context.locale]);
  return result.rows.map((row) => ({
    market:row.market_code,currency:row.currency_code,locale:row.translated_locale??row.source_locale,translationFallback:context.locale!==(row.translated_locale??row.source_locale),minorUnits:context.minorUnits,
    id:row.id,name:row.name,detail:row.detail,price:row.price,portions:row.portions,quantity:Number(row.quantity),category:row.category,foodType:row.food_type,inWeeklyCart:row.in_weekly_cart,productImageUrl:row.product_image_url,
    unit:row.unit,emoji:row.emoji,color:row.color,protein:row.protein_g===null?"미확인":`${Number(row.protein_g)}g / ${row.nutrition_basis}`,
    allergyInfo:row.allergy_info,searchQuery:row.search_query,productUrl:row.product_url,nutritionSourceName:row.nutrition_source_name,
    nutritionSourceUrl:row.nutrition_source_url,nutritionPhotoUrl:row.nutrition_photo_url ?? (row.has_photo?`/api/catalog/photo?item=${encodeURIComponent(row.id)}`:null),
    nutritionBasis:row.nutrition_basis,caloriesKcal:row.calories_kcal===null?null:Number(row.calories_kcal),
    proteinG:row.protein_g===null?null:Number(row.protein_g),carbohydratesG:row.carbohydrates_g===null?null:Number(row.carbohydrates_g),
    fatG:row.fat_g===null?null:Number(row.fat_g),sodiumMg:row.sodium_mg===null?null:Number(row.sodium_mg),
    createdAt:row.created_at?.toISOString()??null,updatedAt:row.updated_at.toISOString(),priceCheckedAt:row.price_checked_at?.toISOString()??null,priceNote:row.price_note,allergens:row.allergens,
  }));
}
