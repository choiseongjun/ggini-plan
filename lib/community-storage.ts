import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
const bucket = "ggini-community";
function storage() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.env.SUPABASE_URL || !key) throw new Error("사진 저장소 설정을 확인해 주세요.");
  return createClient(process.env.SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } }).storage;
}
export async function prepareCommunityBucket() {
  const s = storage(); const { data, error } = await s.getBucket(bucket);
  if (data) { if (data.public) throw new Error("커뮤니티 사진 버킷은 비공개여야 합니다."); return; }
  if (error && !error.message.toLowerCase().includes("not found") && String(error.status) !== "404") throw new Error("커뮤니티 사진 저장소를 확인해 주세요.");
  const result = await s.createBucket(bucket, { public: false, fileSizeLimit: 8 * 1024 * 1024, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] });
  if (result.error) throw new Error("커뮤니티 사진 저장소를 만들지 못했습니다.");
}
export async function uploadCommunityPhoto(photo: { bytes: Buffer; mime: string }) {
  const path = randomUUID(); const { error } = await storage().from(bucket).upload(path, new Uint8Array(photo.bytes), { contentType: photo.mime });
  if (error) throw new Error("사진 저장에 실패했습니다."); return path;
}
export async function readCommunityPhoto(path: string) { const { data, error } = await storage().from(bucket).download(path); if (error || !data) throw new Error("사진을 불러오지 못했습니다."); return data; }
export async function removeCommunityPhoto(path: string) { const { error } = await storage().from(bucket).remove([path]); if (error) console.error("Community photo cleanup failed"); }
