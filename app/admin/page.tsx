"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthScreen } from "../auth-screen";
import { AppLoading } from "../app-loading";
import Image from "next/image";
import { ProductThumb } from "../product-thumb";
import { catalogCategories, type CatalogItem, type CatalogCategory } from "../../lib/catalog";
import "./style.css";

const numericFields = [
  ["caloriesKcal", "열량 (kcal)"], ["proteinG", "단백질 (g)"],
  ["carbohydratesG", "탄수화물 (g)"], ["fatG", "지방 (g)"], ["sodiumMg", "나트륨 (mg)"],
] as const;

export default function AdminPage() {
  const router = useRouter();
  const [loginRequired, setLoginRequired] = useState(false);
  const [loginAttempt, setLoginAttempt] = useState(0);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<CatalogItem | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [ocrText, setOcrText] = useState("");

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  useEffect(() => {
    fetch("/api/admin/catalog", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (response.status === 401 || response.status === 403) {
          setLoginRequired(true);
          if (loginAttempt > 0) setError("이 계정에는 관리자 권한이 없습니다. 등록된 관리자 계정으로 다시 로그인해 주세요.");
          return null;
        }
        if (!response.ok) throw new Error(data.error ?? "상품을 불러오지 못했습니다.");
        return data.items as CatalogItem[];
      })
      .then((data) => { if (!data) return; setLoginRequired(false); setItems(data); setSelectedId(data[0]?.id ?? ""); setDraft(data[0] ?? null); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "상품을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [loginAttempt]);

  function select(id: string) {
    if (recognizing) return;
    setSelectedId(id);
    setDraft(items.find((item) => item.id === id) ?? null);
    setPhoto(null); setPhotoPreview(null); setOcrText("");
    setError(""); setNotice("");
  }

  function newItem() {
    if (recognizing) return;
    setSelectedId("");
    setDraft({ id: "", name: "", detail: "", price: 0, portions: "1끼", quantity: 1, unit: "g", emoji: "🥣", color: "mint", protein: "미확인", searchQuery: "", category: "ready_meal", inWeeklyCart: false, productUrl: null, productImageUrl: null, nutritionSourceName: null, nutritionSourceUrl: null, nutritionPhotoUrl: null, nutritionBasis: null, caloriesKcal: null, proteinG: null, carbohydratesG: null, fatG: null, sodiumMg: null, updatedAt: null });
    setPhoto(null); setPhotoPreview(null); setOcrText(""); setError(""); setNotice("");
  }

  async function readPhoto(file: File) {
    setRecognizing(true); setError(""); setNotice(""); setOcrText("");
    try {
      const form = new FormData();
      form.set("photo", file);
      const response = await fetch("/api/admin/ocr", { method: "POST", body: form });
      const data = await response.json() as { error?: string; text?: string; extracted?: Record<string, number | string | null> };
      if (!response.ok) throw new Error(data.error ?? "사진을 읽지 못했습니다.");
      setOcrText(data.text ?? "");
      if (!data.text || !data.extracted || !Object.values(data.extracted).some((value) => value !== null)) throw new Error("영양 수치를 찾지 못했습니다. 영양표 부분을 크게 찍어 다시 첨부하거나 직접 입력해 주세요.");
      setDraft((current) => current ? {
        ...current,
        ...Object.fromEntries(Object.entries(data.extracted!).filter(([, value]) => value !== null)),
        nutritionSourceName: "상품 포장지 영양표 사진",
      } : null);
      setNotice("사진에서 읽은 값을 입력칸에 채웠습니다. 기준량과 숫자를 확인한 뒤 저장하세요.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "사진을 읽지 못했습니다.");
    } finally { setRecognizing(false); }
  }

  function change<K extends keyof CatalogItem>(key: K, value: CatalogItem[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : null);
    setNotice("");
  }

  function attachPhoto(file: File) {
    if (file.size > 8 * 1024 * 1024) { setError("사진은 8MB 이하로 첨부해 주세요."); return; }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setDraft((current) => current ? {
      ...current, nutritionSourceName: "상품 포장지 영양표 사진", nutritionSourceUrl: null,
      nutritionBasis: null, caloriesKcal: null, proteinG: null,
      carbohydratesG: null, fatG: null, sodiumMg: null,
    } : null);
    void readPhoto(file);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const form = new FormData();
      form.set("item", JSON.stringify(draft));
      if (photo) form.set("photo", photo);
      const response = await fetch("/api/admin/catalog", { method: selectedId ? "PUT" : "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "저장하지 못했습니다.");
      const saved = data.items as CatalogItem[];
      setItems(saved);
      setSelectedId(data.id);
      setDraft(saved.find((item) => item.id === data.id) ?? null);
      setPhoto(null); setPhotoPreview(null); setOcrText("");
      setNotice("저장했습니다. 상품 목록에 바로 반영됩니다.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "저장하지 못했습니다.");
    } finally { setSaving(false); }
  }

  if (loginRequired && !loading) return <main className="admin-login-shell"><AuthScreen key={loginAttempt} admin initialError={error} onExplore={() => router.push("/")} onSuccess={() => { setError(""); setLoading(true); setLoginAttempt(value => value + 1); }}/></main>;

  return <main className="admin-shell">
    {(saving||recognizing)&&<AppLoading message={recognizing?"영양표를 꼼꼼히 읽고 있어요":"상품 정보를 저장하고 있어요"}/>}
    <header className="admin-header"><div><span className="admin-kicker">KKINIPLAN · CONTENT MANAGER</span><h1>상품·영양 정보 관리</h1><p>판매 상품 링크와 표시된 영양 성분을 원문 출처와 함께 관리합니다.</p></div><Link href="/">앱으로 돌아가기 ↗</Link></header>
    {loading ? <AppLoading message="상품 정보를 불러오고 있어요"/> : !draft ? <div className="admin-message"><strong>{error || "상품이 없습니다."}</strong>{error ? <button type="button" onClick={() => { setError(""); setLoading(true); setLoginAttempt(value => value + 1); }}>다시 불러오기</button> : <button type="button" onClick={newItem}>첫 상품 등록하기</button>}</div> : <div className="admin-grid">
      <aside className="admin-list" aria-label="상품 선택"><h2>전체 상품 <span>{items.length}</span></h2><button type="button" className="admin-new-button" onClick={newItem}>＋ 새 상품 추가</button>{items.map((item) => <button type="button" key={item.id} disabled={recognizing} className={selectedId === item.id ? "selected" : ""} onClick={() => select(item.id)}><ProductThumb item={item}/><span><strong>{item.name}</strong><small>{catalogCategories[item.category]} · {item.nutritionSourceUrl || item.nutritionPhotoUrl ? "영양 출처 등록됨" : "영양 출처 미등록"}</small></span></button>)}</aside>
      <form className="admin-form" onSubmit={save}>
        <div className="admin-form-head"><div><span className="admin-kicker">PRODUCT · {draft.id ? draft.id.toUpperCase() : "NEW"}</span><h2>{draft.name || "새 상품"}</h2></div><button type="submit" disabled={saving || recognizing}>{saving ? "저장 중…" : draft.id ? "변경사항 저장" : "상품 등록"}</button></div>
        {error && <p className="admin-alert error" role="alert">{error}</p>}{notice && <p className="admin-alert success" role="status">{notice}</p>}
        <section><h3>판매 상품</h3><p>실제 상품 페이지의 상품명·구성·가격을 확인해 입력하세요. 가격은 확인 시점의 참고값입니다.</p><div className="admin-fields">
          <label>상품 종류<select value={draft.category} onChange={(e) => change("category", e.target.value as CatalogCategory)}>{Object.entries(catalogCategories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>수량 단위<select value={draft.unit} onChange={(e) => change("unit", e.target.value as "g" | "개")}><option value="g">g</option><option value="개">개</option></select></label>
          <label>상품 아이콘<input required maxLength={10} value={draft.emoji} onChange={(e) => change("emoji", e.target.value)}/></label>
          <label className="admin-check"><input type="checkbox" checked={draft.inWeeklyCart} onChange={(e) => change("inWeeklyCart", e.target.checked)}/> 이번 주 장바구니에 포함</label>
          <label>상품명<input required maxLength={120} value={draft.name} onChange={(e) => change("name", e.target.value)}/></label>
          <label>구성·용량<input required maxLength={200} value={draft.detail} onChange={(e) => change("detail", e.target.value)}/></label>
          <label>예상 가격 (원)<input required type="number" min="0" max="10000000" step="1" value={draft.price} onChange={(e) => change("price", Number(e.target.value))}/></label>
          <label>계획 사용 횟수<input required maxLength={80} value={draft.portions} onChange={(e) => change("portions", e.target.value)}/></label>
          <label>총 수량 ({draft.unit})<input required type="number" min="0.01" max="1000000" step="0.01" value={draft.quantity} onChange={(e) => change("quantity", Number(e.target.value))}/></label>
          <label>가격 검색어<input required maxLength={200} value={draft.searchQuery} onChange={(e) => change("searchQuery", e.target.value)}/></label>
          <label className="wide">실제 상품 링크<input required={!draft.id} type="url" pattern="https://.*" placeholder="https://..." value={draft.productUrl ?? ""} onChange={(e) => change("productUrl", e.target.value || null)}/></label>
          <label className="wide">상품 대표 사진 링크<input type="url" pattern="https://.*" placeholder="판매처 이미지 주소 · 저장 시 Storage로 복사" value={draft.productImageUrl ?? ""} onChange={(e) => change("productImageUrl", e.target.value || null)}/></label>
        </div>{draft.productImageUrl && <div className="admin-product-preview"><ProductThumb item={draft}/><span>등록할 상품 사진 미리보기</span></div>}{draft.productUrl && <a className="admin-source-link" href={draft.productUrl} target="_blank" rel="noopener noreferrer">상품 페이지 열어 확인하기 ↗</a>}</section>
        <section><h3>영양 성분</h3><p>상품 포장지 또는 제조사 영양표의 기준량을 그대로 적으세요. 일반 식품 정보는 <a href="https://various.foodsafetykorea.go.kr/nutrient/general/food/firstList.do" target="_blank" rel="noopener noreferrer">식약처 K-FIND ↗</a>에서 조회할 수 있습니다.</p>
          <div className="admin-ocr"><div><strong>영양표 사진 첨부</strong><span>JPG, PNG, WEBP · 최대 8MB · 영양표가 크게 보이도록 촬영</span></div><input aria-label="영양표 사진 선택" type="file" accept="image/jpeg,image/png,image/webp" disabled={recognizing} onChange={(event) => { const file = event.target.files?.[0]; if (file) attachPhoto(file); event.target.value = ""; }}/>{recognizing && <small role="status">사진의 글자를 읽는 중입니다…</small>}{photoPreview && <Image src={photoPreview} alt="첨부한 영양표 미리보기" width={400} height={260} unoptimized/>}{draft.nutritionPhotoUrl && !photoPreview && <a href={draft.nutritionPhotoUrl} target="_blank" rel="noopener noreferrer">저장된 영양표 사진 보기 ↗</a>}{ocrText && <details><summary>인식한 원문 확인</summary><pre>{ocrText}</pre></details>}</div>
          <div className="admin-fields">
          <label>영양표 기준량<input maxLength={80} placeholder="예: 100g당 / 1팩(100g)당" value={draft.nutritionBasis ?? ""} onChange={(e) => change("nutritionBasis", e.target.value || null)}/></label>
          <label>출처 이름<input maxLength={120} placeholder="예: 제조사 공식몰" value={draft.nutritionSourceName ?? ""} onChange={(e) => change("nutritionSourceName", e.target.value || null)}/></label>
          <label className="wide">영양 정보 원문 링크<input type="url" pattern="https://.*" placeholder="https://..." value={draft.nutritionSourceUrl ?? ""} onChange={(e) => change("nutritionSourceUrl", e.target.value || null)}/></label>
          {numericFields.map(([key, label]) => <label key={key}>{label}<input type="number" min="0" max="100000" step="0.01" placeholder="미확인" value={draft[key] ?? ""} onChange={(e) => change(key, e.target.value === "" ? null : Number(e.target.value))}/></label>)}
        </div>{draft.nutritionSourceUrl && <a className="admin-source-link" href={draft.nutritionSourceUrl} target="_blank" rel="noopener noreferrer">영양 정보 원문 열어 확인하기 ↗</a>}</section>
        <div className="admin-footer"><span>{draft.updatedAt ? `마지막 수정 ${new Date(draft.updatedAt).toLocaleString("ko-KR")}` : "아직 저장되지 않은 상품"}</span><button type="submit" disabled={saving || recognizing}>{saving ? "저장 중…" : draft.id ? "변경사항 저장" : "상품 등록"}</button></div>
      </form>
    </div>}
  </main>;
}
