import { join } from "node:path";
import { NextRequest } from "next/server";
import { createWorker, PSM } from "tesseract.js";
import sharp from "sharp";
import { adminUser } from "../../../../lib/admin";
import { sameOrigin } from "../../../../lib/auth";
import { emptyNutrition, extractNutrition, hasMultipleNutritionTables } from "../../../../lib/nutrition-ocr";
import { validatedPhoto } from "../../../../lib/nutrition-photo";
import {nutritionAIConfig, readNutritionWithAI, NutritionAIError} from '../../../../lib/nutrition-ai';

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!await adminUser(request)) return Response.json({error:'관리자 권한이 필요합니다.'},{status:403});
  return Response.json(nutritionAIConfig(),{headers:{'Cache-Control':'no-store'}});
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return Response.json({ error: "요청 출처가 올바르지 않습니다." }, { status: 403 });
  try {
    if (!await adminUser(request)) return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    const form = await request.formData();
    const photo = await validatedPhoto(form.get("photo"));
    if (!photo) return Response.json({ error: "사진을 첨부해 주세요." }, { status: 400 });
    if (nutritionAIConfig().configured) return Response.json(await readNutritionWithAI({image:photo.bytes}), {headers:{'Cache-Control':'no-store'}});
    // Work on the original pixels before OCR; cap decoded and output dimensions.
    const image = await sharp(photo.bytes, { limitInputPixels: 25_000_000 })
      .rotate().resize({ width: 2800, height: 2800, fit: "inside" })
      .normalize().png().toBuffer();
    const worker = await createWorker("kor+eng", 1, { langPath: join(process.cwd(), "assets", "ocr") });
    try {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
      const result = (await worker.recognize(image)).data;
      const text = result.text.trim();
      const multiple = hasMultipleNutritionTables(text);
      const uncertain = result.confidence < 70;
      const warning = multiple
        ? "여러 영양표가 감지됐습니다. 표 하나를 선택해 다시 읽어 주세요. 구성품 수치를 상품 전체 값으로 입력하지 마세요."
        : uncertain ? "사진의 글자가 작거나 흐려 정확히 읽지 못했습니다. 영양표 영역을 선택하거나 더 큰 원본 사진을 첨부해 주세요. 추측한 값은 입력하지 않았습니다." : null;
      return Response.json({ text, warning, extracted: warning ? emptyNutrition : extractNutrition(text) }, { headers: { "Cache-Control": "no-store" } });
    } finally {
      await worker.terminate();
    }
  } catch (error) {
    if (error instanceof NutritionAIError) return Response.json({error:error.message},{status:502});
    if (error instanceof Error && (error.message.includes("사진") || error.message.includes("JPG"))) return Response.json({ error: error.message }, { status: 400 });
    console.error("Nutrition OCR failed", error);
    return Response.json({ error: "사진의 글자를 읽지 못했습니다. 선명하게 촬영한 영양표를 다시 첨부해 주세요." }, { status: 500 });
  }
}
