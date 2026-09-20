import {getPool} from './db';
export const oasisSpecs=[{id:2621,grams:420,name:'우리콩 솔잎두부 (찌개용 420g)'},{id:3560,grams:300,name:'좋은콩 부침두부 (300g)'},{id:3561,grams:300,name:'좋은콩 찌개두부 (300g)'}];
export function parseOasisProduct(html:string,spec:typeof oasisSpecs[number]){
 const name=html.match(/property="og:title" content="([^"]+)"/)?.[1];
 const image=html.match(/property="og:image" content="([^"]+)"/)?.[1];
 const price=Number(html.match(/var discountPrice = "(\d+)"/)?.[1]);
 const displayed=html.match(/class="totalCouponDiscountPrice_price">([\d,]+)원/)?.[1];
 if(name!==spec.name||!image?.startsWith('https://oasisprodproduct.edge.naverncp.com/')||!Number.isSafeInteger(price)||price<=0||Number(displayed?.replaceAll(',',''))!==price)throw new Error('판매 구성 또는 가격 표시가 바뀌어 건너뛰었어요.');
 return {id:`oasis-${spec.id}`,name,detail:`${spec.grams}g · 1팩`,price,image,url:`https://www.oasis.co.kr/product/detail/${spec.id}`};
}
export async function collectOasis(){
 const c=await getPool().connect();let locked=false;
 try{
  locked=(await c.query('SELECT pg_try_advisory_lock(741982,3) AS locked')).rows[0].locked;
  if(!locked)throw new Error('이미 오아시스 상품을 수집하고 있어요. 잠시 후 확인해 주세요.');
  const results=[];
  for(const spec of oasisSpecs){
   try{
    const response=await fetch(`https://www.oasis.co.kr/product/detail/${spec.id}`,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
    if(!response.ok){results.push({name:spec.name,status:'failed',message:`판매처 응답 오류 (${response.status})`});if([403,429].includes(response.status))break;continue;}
    const p=parseOasisProduct(await response.text(),spec);
    const existing=await c.query('SELECT id,name,detail,unit,quantity,market_code,currency_code,product_url FROM catalog_items WHERE id=$1 OR product_url=$2',[p.id,p.url]);
    const old=existing.rows[0];
    if(old&&(old.id!==p.id||old.name!==p.name||old.detail!==p.detail||old.unit!=='개'||Number(old.quantity)!==1||old.market_code!=='KR'||old.currency_code!=='KRW'||old.product_url!==p.url))throw new Error('관리자 상품 구성이 변경되어 자동 갱신하지 않았어요.');
    if(old){await c.query("UPDATE catalog_items SET price=$2,product_image_url=$3,price_checked_at=NOW(),price_note='오아시스 표시 판매가 · 쿠폰 적용 전 · 배송비 별도',updated_at=NOW() WHERE id=$1",[p.id,p.price,p.image]);}
    else{await c.query(`INSERT INTO catalog_items (id,name,detail,price,portions,quantity,unit,category,food_type,emoji,color,search_query,product_url,product_image_url,price_checked_at,price_note,in_weekly_cart,allergens,allergy_info,market_code,currency_code,source_locale) VALUES ($1,$2,$3,$4,'1팩',1,'개','ingredient','tofu','🥛','mint',$2,$5,$6,NOW(),'오아시스 표시 판매가 · 쿠폰 적용 전 · 배송비 별도',false,ARRAY[]::text[],$7::jsonb,'KR','KRW','ko-KR')`,[p.id,p.name,p.detail,p.price,p.url,p.image,JSON.stringify({status:'unknown',statement:'',note:'영양·알레르기 표시 검수 전',sourceUrl:p.url,evidenceUrls:[]})]);}
    results.push({name:p.name,status:old?'updated':'inserted',price:p.price});
   }catch(e){results.push({name:spec.name,status:'failed',message:e instanceof Error&&/건너뛰|자동 갱신/.test(e.message)?e.message:'상품을 확인하지 못했어요. 기존 정보는 유지됩니다.'});}
  }
  return {results,checkedAt:new Date().toISOString(),total:oasisSpecs.length};
 }finally{try{if(locked)await c.query('SELECT pg_advisory_unlock(741982,3)');}finally{c.release();}}
}
