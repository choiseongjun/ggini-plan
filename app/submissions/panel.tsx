"use client";
import { useEffect, useState, type FormEvent } from "react";
import {rememberSubmissionReturn,clearSubmissionReturn} from '../../lib/submission-intent';
import Link from 'next/link';
import {trackAnalytics} from '../../lib/analytics';
import Image from "next/image";
import { AuthScreen } from "../auth-screen";
import { SubmissionFields } from "./form";
import { emptySubmission, submissionStatus, type Submission } from "../../lib/submissions";
export default function SubmissionPanel() {
  const [user, setUser] = useState<string | null>(null); const [ready, setReady] = useState(false); const [login, setLogin] = useState(false);
  const [mine, setMine] = useState<Submission[]>([]); const [published, setPublished] = useState<Submission[]>([]);
  const [draft, setDraft] = useState({ ...emptySubmission }); const [editing, setEditing] = useState<Submission | null>(null); const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [revision, setRevision] = useState(0);
  useEffect(()=>{if(new URLSearchParams(location.search).get('kind')==='food'){const frame=requestAnimationFrame(()=>setDraft({...emptySubmission,kind:'food'}));return()=>cancelAnimationFrame(frame);}},[]);
  useEffect(() => { let active = true; fetch("/api/auth/me").then(r => r.json()).then(d => { if (active) {setUser(d.user?.id || null);if(d.user)clearSubmissionReturn();} }).catch(() => { if (active) setError("로그인 상태를 확인하지 못했어요. 새로고침해 주세요."); }).finally(() => { if (active) setReady(true); }); return () => { active = false; }; }, []);
  useEffect(() => { let active = true; async function load() { try { const pub = await fetch("/api/submissions"); if (!pub.ok) throw new Error("공개 제보를 불러오지 못했어요."); const p = await pub.json(); if (active) setPublished(p.items); if (user) { const r = await fetch("/api/submissions?mine=1"); if (!r.ok) throw new Error("내 제보를 불러오지 못했어요."); const d = await r.json(); if (active) setMine(d.items); } } catch (e) { if (active) setError(e instanceof Error ? e.message : "목록을 불러오지 못했어요."); } } void load(); return () => { active = false; }; }, [user, revision]);
  function openLogin(){if(draft.kind==='food')rememberSubmissionReturn();setLogin(true);}
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!user) { openLogin(); return; } setBusy(true); setError(""); setNotice(""); const formElement = e.currentTarget;
    try { const f = new FormData(); f.set("payload", JSON.stringify(draft)); if (editing) { f.set("id", editing.id); f.set("version", String(editing.version)); } if (photo) f.set("photo", photo); const r = await fetch("/api/submissions", { method: "POST", body: f }); const d = await r.json(); if (!r.ok) { if (r.status === 401) openLogin(); throw new Error(d.error); } if(draft.kind==='food')trackAnalytics('food_request_sent');setDraft({ ...emptySubmission,kind:draft.kind }); setEditing(null); setPhoto(null); formElement.reset(); setNotice("제보를 보냈어요. 검토 결과는 아래 내 제보에서 확인하세요."); setRevision(n => n + 1); }
    catch (e) { setError(e instanceof Error ? e.message : "저장에 실패했어요."); } finally { setBusy(false); }
  }
  if (login) return <AuthScreen onExplore={() => {clearSubmissionReturn();setLogin(false);}} onSuccess={u => { clearSubmissionReturn();setUser(u.id); setLogin(false); }}/>;
  return <>
    {error && <p role="alert" className="submission-error">{error}</p>}{notice && <p role="status">{notice}</p>}
    <section id="submit"><h2>{editing ? "제보 수정하기" : "없는 음식·영양정보를 알려주세요"}</h2><p>제품명과 영양표 사진 또는 공식 링크를 보내주세요. 음식 등록 요청은 본인과 관리자만 볼 수 있어요. 자료 확인 뒤 등록하며, 완료 시점은 보장하지 않아요. 보완이 필요하거나 등록하기 어려우면 아래 내 요청에 이유를 남겨요.</p>
      {!ready ? <p role="status">로그인 상태 확인 중…</p> : !user ? <button onClick={openLogin}>로그인하고 제보하기 →</button> : <form onSubmit={submit}><fieldset disabled={busy}><SubmissionFields value={draft} onChange={setDraft}/><label>영양성분표 또는 상품 사진 (선택 · JPG, PNG, WEBP · 최대 8MB)<input key={editing?.id || "new"} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const f = e.target.files?.[0] || null; if (f && f.size > 8 * 1024 * 1024) { setError("사진은 8MB 이하여야 해요."); e.target.value = ""; setPhoto(null); return; } setPhoto(f); }}/></label>{editing?.photo && <p>새 사진을 선택하지 않으면 기존 사진을 유지해요.</p>}<small>영양성분표는 기준량과 수치가 잘 보이게 찍어 주세요. 직접 촬영했거나 공유할 권한이 있는 사진을 올려 주세요. 개인정보는 포함하지 마세요.</small><div className="submission-actions"><button type="submit">{busy ? "보내는 중…" : editing ? "수정 후 다시 제출" : "검토 요청하기"}</button>{editing && <button type="button" onClick={() => { setEditing(null); setDraft({ ...emptySubmission }); setPhoto(null); }}>수정 취소</button>}</div></fieldset></form>}
    </section>
    {user && <section id="mine"><h2>내 요청 · 처리 상태</h2><p>최근 100개 제보 · 보완 요청과 반려 이유도 여기서 확인해요.</p>{!mine.length && <p>아직 제보한 내용이 없어요.</p>}{mine.map(item => <article key={item.id} className="submission-card"><span className="submission-status">{submissionStatus(item)}</span><h3>{item.payload.name}</h3><p>{new Date(item.created_at).toLocaleDateString("ko-KR")}</p>{item.status==='approved'&&item.payload.kind==='food'&&item.payload.foodCode&&<Link href={`/saved-foods?food=${encodeURIComponent(item.payload.foodCode)}`}>등록된 메뉴 확인·저장 →</Link>}{item.review_note && <p className="submission-note">관리자 답변: {item.review_note}</p>}{item.status !== "approved" && <button onClick={() => { setEditing(item); setDraft({ ...item.payload }); setPhoto(null); setError(""); setNotice(""); document.getElementById("submit")?.scrollIntoView({ behavior: "smooth" }); }}>수정해서 제출하기</button>}</article>)}</section>}
    <section id="approved"><h2>함께 찾은 한 끼</h2><p>관리자가 승인한 메뉴와 상품이에요. 가격은 제보·검토 시점 기준이며 최종 가격은 판매처에서 확인하세요.</p>{!published.length && <p>첫 번째 제보를 기다리고 있어요.</p>}{published.map(item => <article key={item.id} className="submission-card">{item.photo && <Image unoptimized width={480} height={320} src={`/api/submissions/photo?id=${item.id}`} alt={item.payload.name}/>}<small>{item.payload.kind === "recipe" ? "직접 만든 메뉴" : "추천 상품"}</small><h3>{item.payload.name}</h3><p>{item.payload.description}</p><p>{item.payload.price.toLocaleString()}원 · {item.payload.portions}</p>{item.payload.kind === "recipe" ? <details><summary>재료와 조리법 보기</summary><h4>재료</h4><p>{item.payload.ingredients}</p><h4>조리법</h4><p>{item.payload.instructions}</p></details> : <a href={item.payload.productUrl} target="_blank" rel="noopener noreferrer nofollow ugc">판매처에서 확인 ↗</a>}</article>)}</section>
  </>;
}
