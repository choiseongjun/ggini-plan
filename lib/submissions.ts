import { catalogCategories, type CatalogCategory } from "./catalog";
export const submissionStatuses = { pending: "검토 중", approved: "승인", needs_changes: "보완 요청", rejected: "반려" } as const;
export type SubmissionPayload = { kind: "product" | "recipe"; name: string; description: string; price: number; productUrl: string; ingredients: string; instructions: string; quantity: number; unit: "g" | "개"; portions: string; category: CatalogCategory; nutrition: string };
export type Submission = { id: string; payload: SubmissionPayload; status: keyof typeof submissionStatuses; review_note?: string; version: number; photo: boolean; created_at: string; catalog_id?: string | null };
export const emptySubmission: SubmissionPayload = { kind: "product", name: "", description: "", price: 0, productUrl: "", ingredients: "", instructions: "", quantity: 1, unit: "개", portions: "1회", category: "ready_meal", nutrition: "" };
export function validateSubmission(input: unknown): SubmissionPayload {
  if (!input || typeof input !== "object") throw new Error("제보 내용을 입력해 주세요.");
  const p = input as Record<string, unknown>;
  const str = (key: string, max: number, required = false) => { const v = typeof p[key] === "string" ? p[key].trim() : ""; if (v.length > max || (required && !v)) throw new Error("이름·추천 이유·필수 내용을 확인해 주세요."); return v; };
  if (p.kind !== "product" && p.kind !== "recipe") throw new Error("제보 종류를 선택해 주세요.");
  const productUrl = str("productUrl", 2048, p.kind === "product");
  if (productUrl) { let u: URL; try { u = new URL(productUrl); } catch { throw new Error("상품 링크를 확인해 주세요."); } if (u.protocol !== "https:" || u.username || u.password) throw new Error("HTTPS 상품 링크를 입력해 주세요."); }
  if (!Number.isInteger(p.price) || Number(p.price) < 0 || Number(p.price) > 10000000) throw new Error("가격은 0~1,000만 원 사이로 입력해 주세요.");
  if (!Number.isFinite(p.quantity) || Number(p.quantity) <= 0 || Number(p.quantity) > 1000000 || !["g", "개"].includes(String(p.unit)) || !Object.hasOwn(catalogCategories, String(p.category))) throw new Error("수량·단위·상품 종류를 확인해 주세요.");
  return { kind: p.kind, name: str("name", 120, true), description: str("description", 1000, true), price: Number(p.price), productUrl, ingredients: str("ingredients", 3000, p.kind === "recipe"), instructions: str("instructions", 5000, p.kind === "recipe"), quantity: Number(p.quantity), unit: p.unit as "g" | "개", portions: str("portions", 80, true), category: p.category as CatalogCategory, nutrition: str("nutrition", 2000) };
}
