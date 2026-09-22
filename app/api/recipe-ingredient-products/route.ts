import {NextRequest} from 'next/server';
import {similarCatalogProducts} from '../../../lib/foodsafety-resolve';

// Government-DB recipes (lib/recipe-optimizer-plan.ts) have no purchase link of their own — matching
// the DISH NAME against catalog_items rarely finds anything (nobody sells a packaged "멸치조림"), but
// its raw ingredients ("멸치", "두부", "대파"...) very often do have real, buyable matches. This is a
// browse-only convenience next to the recipe's cooking video, not wired into the budget/cart engine.
export async function GET(request: NextRequest) {
 const params = request.nextUrl.searchParams;
 const names = (params.get('names') ?? '').split(',').map((n) => n.trim()).filter(Boolean).slice(0, 8);
 if (!names.length) return Response.json({products: []}, {headers: {'Cache-Control': 'no-store'}});
 try {
  const products = await similarCatalogProducts(names, null, 6);
  return Response.json({products}, {headers: {'Cache-Control': 'public, max-age=3600, s-maxage=86400'}});
 } catch (error) {
  console.error('Recipe ingredient product lookup failed', error);
  return Response.json({error: '상품을 불러오지 못했어요.'}, {status: 503});
 }
}
