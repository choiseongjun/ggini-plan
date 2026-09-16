import { getPool } from "../../../../lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const item = new URL(request.url).searchParams.get("item");
  if (!item || item.length > 100) return new Response(null, { status: 404 });
  try {
    const result = await getPool().query<{ nutrition_photo: Buffer; nutrition_photo_mime: string }>(
      "SELECT nutrition_photo, nutrition_photo_mime FROM catalog_items WHERE id=$1 AND nutrition_photo IS NOT NULL",
      [item],
    );
    const photo = result.rows[0];
    if (!photo) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(photo.nutrition_photo), { headers: {
      "Content-Type": photo.nutrition_photo_mime,
      "Content-Disposition": "inline",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    console.error("Nutrition photo lookup failed", error);
    return new Response(null, { status: 503 });
  }
}
