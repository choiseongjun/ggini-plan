import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { MAX_NUTRITION_PHOTO_BYTES, validatedPhoto } from "./nutrition-photo";

export class ImageStorageError extends Error {}
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "ggini-plan";
function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ImageStorageError("이미지 저장소 설정이 필요합니다. 서버의 Supabase URL과 Secret key를 확인해 주세요.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function isStoredImage(value: string) {
  const base = process.env.SUPABASE_URL;
  return !!base && value.startsWith(base.replace(/\/$/, "") + `/storage/v1/object/public/${bucket}/`);
}
export async function prepareImageBucket() {
  const storage = client().storage;
  const { data, error } = await storage.getBucket(bucket);
  if (data) {
    if (!data.public) throw new ImageStorageError("상품 이미지 버킷의 공개 읽기 설정을 확인해 주세요.");
    return;
  }
  if (error && String(error.status) !== "404" && !error.message.toLowerCase().includes("not found")) throw new ImageStorageError("이미지 저장소에 접근하지 못했습니다.");
  const result = await storage.createBucket(bucket, { public: true, fileSizeLimit: MAX_NUTRITION_PHOTO_BYTES, allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] });
  if (result.error) throw new ImageStorageError("상품 이미지 버킷을 생성하지 못했습니다.");
}
export async function storeImage(photo: { bytes: Buffer; mime: string }, kind: "products" | "nutrition") {
  const supabase = client();
  const digest = createHash("sha256").update(photo.bytes).digest("hex");
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[photo.mime];
  if (!ext) throw new ImageStorageError("지원하지 않는 이미지 형식입니다.");
  const path = `${kind}/${digest}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, new Uint8Array(photo.bytes), { contentType: photo.mime, cacheControl: "31536000", upsert: false });
  if (error && String(error.statusCode) !== "409") throw new ImageStorageError("Supabase 이미지 업로드에 실패했습니다. 저장소 설정을 확인해 주세요.");
  // Verify the stored object before replacing a DB value or removing legacy bytes.
  const downloaded = await supabase.storage.from(bucket).download(path);
  if (downloaded.error || !downloaded.data || createHash("sha256").update(Buffer.from(await downloaded.data.arrayBuffer())).digest("hex") !== digest) throw new ImageStorageError("저장된 이미지 검증에 실패했습니다. 기존 사진을 유지합니다.");
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function importProductImage(value: string): Promise<string> {
  if (isStoredImage(value)) return value;
  // Explicit image CDN hosts prevent arbitrary server-side network access.
  const hosts = new Set(["product-image.kurly.com", "img-cf.kurly.com", "img.cjthemarket.com", ...(process.env.IMAGE_IMPORT_HOSTS || "").split(",").map(s => s.trim()).filter(Boolean)]);
  let url = new URL(value);
  const signal = AbortSignal.timeout(15000);
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || !hosts.has(url.hostname)) throw new ImageStorageError("허용된 판매처의 이미지 링크를 입력해 주세요.");
    const response = await fetch(url, { redirect: "manual", signal });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location) break;
      url = new URL(location, url); continue;
    }
    if (!response.ok || !response.body) throw new ImageStorageError("상품 이미지 링크를 불러오지 못했습니다.");
    if (Number(response.headers.get("content-length")) > MAX_NUTRITION_PHOTO_BYTES) { await response.body.cancel(); throw new ImageStorageError("이미지는 8MB 이하여야 합니다."); }
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
    try { while (true) { const { done, value: chunk } = await reader.read(); if (done) break; size += chunk.length; if (size > MAX_NUTRITION_PHOTO_BYTES) throw new ImageStorageError("이미지는 8MB 이하여야 합니다."); chunks.push(chunk); } }
    finally { await reader.cancel(); }
    const photo = await validatedPhoto(new File([Buffer.concat(chunks)], "product"));
    if (!photo) throw new ImageStorageError("이미지 파일이 비어 있습니다.");
    return storeImage(photo, "products");
  }
  throw new ImageStorageError("이미지 링크의 이동 횟수가 너무 많습니다.");
}
