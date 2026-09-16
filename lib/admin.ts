import { NextRequest } from "next/server";
import { sessionUser } from "./auth";

export async function adminUser(request: NextRequest) {
  const user = await sessionUser(request);
  const allowed = (process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  return user && allowed.includes(user.email.toLowerCase()) ? user : null;
}
