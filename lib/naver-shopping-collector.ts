import {randomUUID} from 'node:crypto';
import {getPool} from './db';
import {searchNaverShopping,shoppingQueries} from './naver-shopping-deals';

export async function collectNaverShopping(limit:number,budgetMs:number,queryLimit=2){
 const pool=getPool(),started=Date.now();let scanned=0,published=0,skipped=0,errors=0,lastError='';
 const {rows}=await pool.query('SELECT count(*)::integer AS n FROM food_deal_collection_runs');
 const offset=((rows[0]?.n??1)-1)*2;
 for(let i=0;i<queryLimit&&scanned<limit&&Date.now()-started<budgetMs-8500;i++){
  try{
   const items=await searchNaverShopping(shoppingQueries[(offset+i)%shoppingQueries.length]);
   for(const d of items.slice(0,limit-scanned)){
    scanned++;
    const result=await pool.query(`INSERT INTO food_deals(id,title,food_type,source_name,source_url,product_url,price,shipping,pack,conditions,status,checked_at,original_price,discount_rate,collection_source,deal_category)
     VALUES($1,$2,$3,$4,$5,$6,$7,NULL,$8,$9,'live',now(),NULL,NULL,'naver-shopping',$10)
     ON CONFLICT(source_url) DO UPDATE SET title=EXCLUDED.title,food_type=EXCLUDED.food_type,source_name=EXCLUDED.source_name,product_url=EXCLUDED.product_url,price=EXCLUDED.price,shipping=NULL,pack=EXCLUDED.pack,conditions=EXCLUDED.conditions,status='live',checked_at=now(),updated_at=now(),ends_at=NULL,original_price=NULL,discount_rate=NULL,deal_category=EXCLUDED.deal_category
     WHERE food_deals.collection_source='naver-shopping'`,[randomUUID(),d.title,d.food_type,d.source_name,d.source_url,d.product_url,d.price,d.pack,d.conditions,d.deal_category]);
    if(result.rowCount)published++;else skipped++;
   }
  }catch(e){errors++;lastError=e instanceof Error?e.message:'네이버 쇼핑 수집 실패';break;}
 }
 return {scanned,published,skipped,errors,lastError};
}
