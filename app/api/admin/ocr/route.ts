import { join } from "node:path";
import { NextRequest } from "next/server";
import { createWorker, PSM } from "tesseract.js";
import { adminUser } from "../../../../lib/admin";
import { sameOrigin } from "../../../../lib/auth";
import { extractNutrition } from "../../../../lib/nutrition-ocr";
import { validatedPhoto } from "../../../../lib/nutrition-photo";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return Response.json({ error: "요청 출처가 올바르지 않습니다." }, { status: 403 });
  try {
    if (!await adminUser(request)) return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    const form = await request.formData();
    const photo = await validatedPhoto(form.get("photo"));
    if (!photo) return Response.json({ error: "사진을 첨부해 주세요." }, { status: 400 });
    const worker = await createWorker("kor", 1, { langPath: join(process.cwd(), "assets", "ocr") });
    try {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
      const korean = (await worker.recognize(photo.bytes)).data.text.trim();
      await worker.reinitialize("eng");
      const latin = (await worker.recognize(photo.bytes)).data.text.trim();
      return Response.json({ text: korean, extracted: extractNutrition(korean, latin) }, { headers: { "Cache-Control": "no-store" } });
    } finally {
      await worker.terminate();
    }
  } catch (error) {
    if (error instanceof Error && (error.message.includes("사진") || error.message.includes("JPG"))) return Response.json({ error: error.message }, { status: 400 });
    console.error("Nutrition OCR failed", error);
    return Response.json({ error: "사진의 글자를 읽지 못했습니다. 선명하게 촬영한 영양표를 다시 첨부해 주세요." }, { status: 500 });
  }
}
