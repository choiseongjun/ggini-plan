import {getPool} from './db';
import type {FoodDeal} from './food-deals';
export async function foodDeals(admin=false):Promise<FoodDeal[]>{
 const {rows}=await getPool().query(`SELECT id,title,food_type,source_name,source_url,product_url,price,shipping,pack,conditions,product_id,status,checked_at::text,ends_at::text,updated_at::text FROM food_deals ${admin?'':"WHERE status<>'draft'"} ORDER BY checked_at DESC NULLS LAST,updated_at DESC LIMIT 300`);
 return rows;
}
