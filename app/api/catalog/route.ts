import { catalogItems } from "../../../lib/catalog-db";
import {marketContext,RegionError} from '../../../lib/regional-db';

export const runtime = "nodejs";

export async function GET(request?:Request) {
  try {
    const params=request?new URL(request.url).searchParams:null;
    const region=await marketContext(params?.get('market')??'KR',params?.get('locale')??undefined);
    return Response.json({ items: await catalogItems(region),region }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if(error instanceof RegionError)return Response.json({error:error.message},{status:400});
    console.error("Catalog lookup failed", error);
    return Response.json({ error: "상품 정보를 불러오지 못했습니다." }, { status: 503 });
  }
}
