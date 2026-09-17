import {getPool} from '../../../../lib/db';
import {marketContext,RegionError} from '../../../../lib/regional-db';
export const runtime='nodejs';
export async function GET(request:Request){
 try{
  const q=new URL(request.url).searchParams,region=await marketContext(q.get('market')??'KR',q.get('locale')??undefined),product=q.get('product');
  if(!product||product.length>100)return Response.json({error:'Product required'},{status:400});
  const offers=await getPool().query(`SELECT o.id,o.product_id AS "productId",o.market_code AS market,o.currency_code AS currency,o.price_minor::text AS "amountMinor",o.shipping_minor::text AS "shippingMinor",o.tax_included AS "taxIncluded",o.product_url AS url,o.availability,o.checked_at AS "checkedAt",o.source_url AS "sourceUrl",s.name AS seller,COALESCE(t.name,p.name) AS name,COALESCE(t.locale_code,p.source_locale) AS locale
  FROM catalog_offers o JOIN catalog_items p ON p.id=o.product_id JOIN market_sellers s ON s.market_code=o.market_code AND s.seller_key=o.seller_key LEFT JOIN catalog_translations t ON t.product_id=p.id AND t.locale_code=$3
  WHERE o.product_id=$1 AND o.market_code=$2 AND o.currency_code=$4 AND o.availability<>'discontinued' ORDER BY o.price_minor,o.id`,[product,region.market,region.locale,region.currency]);
  return Response.json({region,offers:offers.rows},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof RegionError?e.message:'Offers unavailable'},{status:e instanceof RegionError?400:503});}
}
