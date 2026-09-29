import {NextRequest} from 'next/server';
import {getPool} from '../../../lib/db';
import {ingredientSearchTerms,matchesIngredientProduct} from '../../../lib/recipe-ingredient-products';

// Government-DB recipes (lib/recipe-optimizer-plan.ts) have no purchase link of their own — matching
// the DISH NAME against catalog_items rarely finds anything (nobody sells a packaged "멸치조림"), but
// its raw ingredients ("멸치", "두부", "대파"...) very often do have real, buyable matches. This is a
// browse-only convenience next to the recipe's cooking video, not wired into the budget/cart engine.
export async function GET(request: NextRequest) {
 const params = request.nextUrl.searchParams;
 const names = (params.get('names') ?? '').split(',').map((n) => n.trim()).filter(Boolean).slice(0, 8);
 const terms=ingredientSearchTerms(names);
 if (!terms.length) return Response.json({products: []}, {headers: {'Cache-Control': 'no-store'}});
 try {
  const {rows}=await getPool().query(
   `SELECT id,name,category,price,product_url,product_image_url FROM catalog_items
    WHERE category='ingredient' AND price>0 AND product_url LIKE 'https://%'
    AND name ILIKE ANY($1::text[]) ORDER BY price ASC,id ASC`,
   [terms.map(term=>`%${term.replace(/[\\%_]/g,'\\$&')}%`)],
  );
  const products=rows.filter(r=>matchesIngredientProduct(r.name,r.category,terms)).slice(0,6)
   .map(r=>({id:r.id,name:r.name,price:Number(r.price),productUrl:r.product_url,productImageUrl:r.product_image_url}));
  return Response.json({products}, {headers: {'Cache-Control': 'no-store'}});
 } catch (error) {
  console.error('Recipe ingredient product lookup failed', error);
  return Response.json({error: '상품을 불러오지 못했어요.'}, {status: 503});
 }
}
