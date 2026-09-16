import { NextRequest } from "next/server";
import { sessionUser } from "../../../../lib/auth";
import { adminUser } from "../../../../lib/admin";
import { getPool } from "../../../../lib/db";
import { readSubmissionPhoto } from "../../../../lib/submission-storage";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });
  try {
    const row = (await getPool().query("SELECT user_id,status,photo_path FROM submissions WHERE id=$1", [id])).rows[0];
    if (!row?.photo_path) return new Response(null, { status: 404 });
    if (row.status !== "approved") { const user = await sessionUser(request); if (user?.id !== String(row.user_id) && !await adminUser(request)) return new Response(null, { status: 404 }); }
    const image = await readSubmissionPhoto(row.photo_path);
    return new Response(image, { headers: { "Content-Type": image.type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response(null, { status: 503 }); }
}
