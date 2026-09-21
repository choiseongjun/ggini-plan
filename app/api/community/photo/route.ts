import { NextRequest } from "next/server";
import { getPool } from "../../../../lib/db";
import { readCommunityPhoto } from "../../../../lib/community-storage";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^[1-9][0-9]{0,17}$/.test(id)) return new Response(null, { status: 404 });
  try {
    const row = (await getPool().query("SELECT photo_path FROM community_posts WHERE id=$1", [id])).rows[0];
    if (!row?.photo_path) return new Response(null, { status: 404 });
    const image = await readCommunityPhoto(row.photo_path);
    return new Response(image, { headers: { "Content-Type": image.type, "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response(null, { status: 503 }); }
}
