import { type CatalogCategory, type CatalogItem } from "./catalog";
import { getPool } from "./db";

type CatalogRow = {
  allergy_info: CatalogItem['allergyInfo'];
  category: CatalogCategory; in_weekly_cart: boolean;
  product_image_url: string | null;
  unit: "g" | "개"; emoji: string; color: string; price_checked_at: Date | null; price_note: string | null; allergens: string[];
  id: string; name: string; detail: string; price: number; portions: string;
  quantity: string; search_query: string; product_url: string | null;
  nutrition_source_name: string | null; nutrition_source_url: string | null;
  has_photo: boolean; nutrition_photo_url: string | null;
  nutrition_basis: string | null; calories_kcal: string | null;
  protein_g: string | null; carbohydrates_g: string | null; fat_g: string | null;
  sodium_mg: string | null; updated_at: Date;
};

export async function catalogItems(): Promise<CatalogItem[]> {
  const result = await getPool().query<CatalogRow>(`SELECT category,in_weekly_cart,product_image_url,unit,emoji,color,price_checked_at,price_note,allergens,id, name, detail, price, portions, quantity, search_query, product_url,
    allergy_info, nutrition_source_name, nutrition_source_url, nutrition_basis, calories_kcal, protein_g,
    carbohydrates_g, fat_g, sodium_mg, updated_at, nutrition_photo_url, nutrition_photo IS NOT NULL AS has_photo
    FROM catalog_items ORDER BY id`);
  return result.rows.map((row) => ({
    id:row.id,name:row.name,detail:row.detail,price:row.price,portions:row.portions,quantity:Number(row.quantity),category:row.category,inWeeklyCart:row.in_weekly_cart,productImageUrl:row.product_image_url,
    unit:row.unit,emoji:row.emoji,color:row.color,protein:row.protein_g===null?"미확인":`${Number(row.protein_g)}g / ${row.nutrition_basis}`,
    allergyInfo:row.allergy_info,searchQuery:row.search_query,productUrl:row.product_url,nutritionSourceName:row.nutrition_source_name,
    nutritionSourceUrl:row.nutrition_source_url,nutritionPhotoUrl:row.nutrition_photo_url ?? (row.has_photo?`/api/catalog/photo?item=${encodeURIComponent(row.id)}`:null),
    nutritionBasis:row.nutrition_basis,caloriesKcal:row.calories_kcal===null?null:Number(row.calories_kcal),
    proteinG:row.protein_g===null?null:Number(row.protein_g),carbohydratesG:row.carbohydrates_g===null?null:Number(row.carbohydrates_g),
    fatG:row.fat_g===null?null:Number(row.fat_g),sodiumMg:row.sodium_mg===null?null:Number(row.sodium_mg),
    updatedAt:row.updated_at.toISOString(),priceCheckedAt:row.price_checked_at?.toISOString()??null,priceNote:row.price_note,allergens:row.allergens,
  }));
}
