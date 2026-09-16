import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { adminUser } from "../../../../lib/admin";
import { sameOrigin } from "../../../../lib/auth";
import { catalogCategories, type CatalogCategory } from "../../../../lib/catalog";
import { catalogItems } from "../../../../lib/catalog-db";
import { getPool } from "../../../../lib/db";
import { validatedPhoto } from "../../../../lib/nutrition-photo";

export const runtime = "nodejs";

type Input = Record<string, unknown>;
const textField = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;
const optionalText = (value: unknown, max: number) => value === null || value === "" ? null : textField(value, max);
const httpsUrl = (value: unknown) => {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048) throw new Error("링크는 2048자 이하의 HTTPS 주소여야 합니다.");
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("HTTPS 링크만 입력할 수 있습니다.");
  return url.toString();
};
const optionalNumber = (value: unknown) => {
  if (value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100000) throw new Error("영양 수치는 0 이상의 숫자로 입력해 주세요.");
  return number;
};

export async function GET(request: NextRequest) {
  try {
    if (!await adminUser(request)) return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    return Response.json({ items: await catalogItems() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin catalog lookup failed", error);
    return Response.json({ error: "DB 연결을 확인해 주세요." }, { status: 503 });
  }
}

async function saveItem(request: NextRequest, create: boolean) {
  if (!sameOrigin(request)) return Response.json({ error: "요청 출처가 올바르지 않습니다." }, { status: 403 });
  try {
    const user = await adminUser(request);
    if (!user) return Response.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    const form = request.headers.get("content-type")?.includes("multipart/form-data") ? await request.formData() : null;
    const input = (form ? JSON.parse(String(form.get("item") ?? "{}")) : await request.json()) as Input;
    const photo = form ? await validatedPhoto(form.get("photo")) : null;
    const id = create ? randomUUID() : input.id;
    if (typeof id !== "string" || id.length > 100 || (!create && !(await getPool().query("SELECT 1 FROM catalog_items WHERE id=$1", [id])).rowCount)) return Response.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });
    const name = textField(input.name, 120);
    const detail = textField(input.detail, 200);
    const portions = textField(input.portions, 80);
    const searchQuery = textField(input.searchQuery, 200);
    const price = Number(input.price);
    const quantity = Number(input.quantity);
    const category = input.category as CatalogCategory;
    const unit = input.unit;
    const emoji = textField(input.emoji, 10);
    const color = textField(input.color, 30);
    const inWeeklyCart = input.inWeeklyCart;
    if (!Object.hasOwn(catalogCategories, category) || (unit !== "g" && unit !== "개") || !emoji || !color || typeof inWeeklyCart !== "boolean") {
      return Response.json({ error: "상품 종류와 표시 정보를 확인해 주세요." }, { status: 400 });
    }
    if (!name || !detail || !portions || !searchQuery || !Number.isSafeInteger(price) || price < 0 || price > 10000000 || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000) {
      return Response.json({ error: "상품명, 구성, 가격, 수량과 검색어를 확인해 주세요." }, { status: 400 });
    }
    const productUrl = httpsUrl(input.productUrl);
    const productImageUrl = httpsUrl(input.productImageUrl);
    if (create && !productUrl) return Response.json({ error: "새 상품에는 실제 판매 상품 링크가 필요합니다." }, { status: 400 });
    const sourceUrl = httpsUrl(input.nutritionSourceUrl);
    const sourceName = optionalText(input.nutritionSourceName, 120);
    const basis = optionalText(input.nutritionBasis, 80);
    const nutrients = [input.caloriesKcal, input.proteinG, input.carbohydratesG, input.fatG, input.sodiumMg].map(optionalNumber);
    const existingPhoto = await getPool().query<{ has_photo: boolean }>("SELECT nutrition_photo IS NOT NULL AS has_photo FROM catalog_items WHERE id=$1", [id]);
    if (nutrients.some((value) => value !== null) && (!sourceName || !basis || (!sourceUrl && !photo && !existingPhoto.rows[0]?.has_photo))) {
      return Response.json({ error: "영양 수치를 입력하려면 기준량, 출처 이름과 원문 링크 또는 사진이 필요합니다." }, { status: 400 });
    }
    await getPool().query(
      `INSERT INTO catalog_items (id, name, detail, price, portions, quantity, search_query, product_url, nutrition_source_name, nutrition_source_url, nutrition_basis, calories_kcal, protein_g, carbohydrates_g, fat_g, sodium_mg, updated_by, nutrition_photo, nutrition_photo_mime, category, in_weekly_cart, unit, emoji, color, price_checked_at, product_image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,CASE WHEN $8::text IS NOT NULL THEN NOW() ELSE NULL END,$25)
       ON CONFLICT (id) DO UPDATE SET name=$2, detail=$3, price=$4, portions=$5, quantity=$6, search_query=$7, product_url=$8, nutrition_source_name=$9, nutrition_source_url=$10, nutrition_basis=$11, calories_kcal=$12, protein_g=$13, carbohydrates_g=$14, fat_g=$15, sodium_mg=$16, updated_by=$17, nutrition_photo=COALESCE($18,catalog_items.nutrition_photo), nutrition_photo_mime=COALESCE($19,catalog_items.nutrition_photo_mime), category=$20, in_weekly_cart=$21, unit=$22, emoji=$23, color=$24, product_image_url=$25, price_checked_at=CASE WHEN $8::text IS NOT NULL THEN NOW() ELSE NULL END, updated_at=NOW()`,
      [id, name, detail, price, portions, quantity, searchQuery, productUrl, sourceName, sourceUrl, basis, ...nutrients, user.id, photo?.bytes ?? null, photo?.mime ?? null, category, inWeeklyCart, unit, emoji, color, productImageUrl],
    );
    return Response.json({ id, items: await catalogItems() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) return Response.json({ error: "입력 형식을 확인해 주세요." }, { status: 400 });
    if (error instanceof Error && (error.message.includes("링크") || error.message.includes("영양"))) return Response.json({ error: error.message }, { status: 400 });
    console.error("Admin catalog update failed", error);
    return Response.json({ error: "상품 저장에 실패했습니다. DB 연결을 확인해 주세요." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) { return saveItem(request, true); }
export async function PUT(request: NextRequest) { return saveItem(request, false); }
