import {getPool} from './db';
import type {FoodDeal} from './food-deals';
export async function foodDeals(admin=false):Promise<FoodDeal[]>{
 const {rows}=await getPool().query(`SELECT original_price,discount_rate::float8,collection_source,deal_category,id,title,food_type,source_name,source_url,product_url,price,shipping,pack,conditions,product_id,status,checked_at::text,ends_at::text,updated_at::text FROM food_deals ${admin?'':"WHERE status<>'draft'"} ORDER BY (status='live' AND checked_at>now()-CASE WHEN collection_source IS NULL THEN interval '24 hours' ELSE interval '36 hours' END) DESC,discount_rate DESC NULLS LAST,checked_at DESC NULLS LAST LIMIT 1000`);
 return rows;
}
