"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AuthScreen } from "../../auth-screen";
import { SubmissionFields } from "../../submissions/form";
import { submissionStatuses, type Submission, type SubmissionPayload } from "../../../lib/submissions";
import "../../submissions/style.css";
export default function ReviewPage() {
  const router = useRouter();
  const [items, setItems] = useState<Submission[]>([]); const [revision, setRevision] = useState(0); const [auth, setAuth] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  useEffect(() => { let active = true; fetch("/api/admin/submissions").then(async r => { if (r.status === 403) { if (active) setAuth(true); return; } const d = await r.json(); if (!r.ok) throw new Error(d.error); if (active) { setItems(d.items); setAuth(false); } }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [revision]);
  if (auth) return <main className="submission-shell"><AuthScreen admin initialError={revision ? "관리자로 등록된 계정으로 로그인해 주세요." : ""} onExplore={() => router.push("/")} onSuccess={() => { setLoading(true); setRevision(n => n + 1); }}/></main>;
  return <main className="submission-shell"><header><Link href="/admin">← 상품 관리</Link><Link href="/submissions">공개 제보 보기 ↗</Link></header><h1>메뉴·상품 제보 검토</h1><p>최근 200개 · 검토 중인 제보가 먼저 표시됩니다. 승인 전에 원문·가격·사진과 내용을 확인하세요.</p>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}<button onClick={() => setRevision(n => n + 1)}>목록 새로고침</button>{loading ? <p>불러오는 중…</p> : !items.length ? <p>접수된 제보가 없습니다.</p> : items.map(item => <ReviewCard key={`${item.id}-${item.version}`} item={item} onDone={() => { setNotice("검토 결과를 저장했습니다."); setRevision(n => n + 1); }}/>)}</main>;
}
function ReviewCard({ item, onDone }: { item: Submission; onDone: () => void }) {
  const [payload, setPayload] = useState<SubmissionPayload>(item.payload); const [note, setNote] = useState(item.review_note || ""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function review(status: string) { setBusy(true); setError(""); try { const r = await fetch("/api/admin/submissions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, version: item.version, payload, status, note }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); onDone(); } catch (e) { setError(e instanceof Error ? e.message : "저장 실패"); } finally { setBusy(false); } }
  return <article className="submission-card"><span className="submission-status">{submissionStatuses[item.status]}</span><h2>{item.payload.name}</h2>{item.photo && <Image unoptimized width={480} height={320} src={`/api/submissions/photo?id=${item.id}`} alt="제보 사진"/>}{item.payload.productUrl && <p><a href={item.payload.productUrl} target="_blank" rel="noopener noreferrer">판매 원문 확인 ↗</a></p>}<details open={item.status === "pending"}><summary>제보 내용 확인·수정</summary><fieldset disabled={busy || item.status !== "pending"}><SubmissionFields value={payload} onChange={setPayload}/><label>검토 답변 (보완 요청·반려 시 필수)<textarea maxLength={1000} value={note} onChange={e => setNote(e.target.value)}/></label>{item.status === "pending" && <><p>상품 승인 시 카탈로그에 등록됩니다. 메뉴는 공개 목록에만 등록되며 개인 맞춤 식단에 자동 포함되지 않습니다.</p><div className="submission-actions"><button onClick={() => review("approved")}>승인하고 공개</button><button onClick={() => review("needs_changes")}>보완 요청</button><button onClick={() => review("rejected")}>반려</button></div></>}</fieldset></details>{error && <p role="alert">{error}</p>}</article>;
}
