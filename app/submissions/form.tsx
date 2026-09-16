"use client";
import { catalogCategories } from "../../lib/catalog";
import type { SubmissionPayload } from "../../lib/submissions";
export function SubmissionFields({ value, onChange }: { value: SubmissionPayload; onChange: (v: SubmissionPayload) => void }) {
  const set = (key: keyof SubmissionPayload, v: string | number) => onChange({ ...value, [key]: v });
  return <div className="submission-fields">
    <label>제보 종류<select value={value.kind} onChange={e => set("kind", e.target.value)}><option value="product">구매 가능한 상품</option><option value="recipe">직접 만든 메뉴</option></select></label>
    <label>이름<input required maxLength={120} value={value.name} onChange={e => set("name", e.target.value)}/></label>
    <label>추천 이유<textarea required maxLength={1000} value={value.description} onChange={e => set("description", e.target.value)} placeholder="어떤 점이 좋았나요?"/></label>
    <label>{value.kind === "product" ? "구매 가격 (원)" : "대략적인 재료 비용 (원)"}<input required type="number" min={0} max={10000000} value={value.price} onChange={e => set("price", Number(e.target.value))}/></label>
    <label>몇 끼·몇 회 분량인가요?<input required maxLength={80} value={value.portions} onChange={e => set("portions", e.target.value)}/></label>
    {value.kind === "product" ? <><label>구매 링크<input required type="url" pattern="https://.*" maxLength={2048} value={value.productUrl} onChange={e => set("productUrl", e.target.value)} placeholder="https://"/></label><label>상품 종류<select value={value.category} onChange={e => set("category", e.target.value)}>{Object.entries(catalogCategories).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></label><label>총중량 또는 개수<input required type="number" min={0.01} max={1000000} step={0.01} value={value.quantity} onChange={e => set("quantity", Number(e.target.value))}/></label><label>단위<select value={value.unit} onChange={e => set("unit", e.target.value)}><option value="g">g</option><option value="개">개</option></select></label></> : <><label>재료와 분량<textarea required maxLength={3000} value={value.ingredients} onChange={e => set("ingredients", e.target.value)}/></label><label>간단한 조리법<textarea required maxLength={5000} value={value.instructions} onChange={e => set("instructions", e.target.value)}/></label></>}
    <label>영양정보·출처 (선택)<textarea maxLength={2000} value={value.nutrition} onChange={e => set("nutrition", e.target.value)} placeholder="포장지의 기준량과 영양성분, 확인한 출처를 적어 주세요."/></label>
    <small>영양정보는 관리자 검토용입니다. 검증 전에는 맞춤 식단 계산에 사용하지 않아요.</small>
  </div>;
}
