import { catalogItems } from "../../../lib/catalog-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json({ items: await catalogItems() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Catalog lookup failed", error);
    return Response.json({ error: "상품 정보를 불러오지 못했습니다." }, { status: 503 });
  }
}
