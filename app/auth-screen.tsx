"use client";

import { useState, type FormEvent } from "react";
import { AppLoading } from "./app-loading";
import type { PublicUser } from "../lib/auth";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { firebaseAuth, firebaseLoginMessage } from "../lib/firebase-client";

type AuthResponse = { user?: PublicUser; error?: string };

export function AuthScreen({ onSuccess, onExplore, initialError = "", admin = false }: { onSuccess: (user: PublicUser) => void; onExplore: () => void; initialError?: string; admin?: boolean }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

  async function signInWithGoogle() {
    setGooglePending(true);
    setError("");
    try {
      const auth = firebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);
      try {
        const response = await fetch("/api/auth/firebase", {
          method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: await credential.user.getIdToken() }),
        });
        const data = await response.json() as AuthResponse;
        if (!response.ok || !data.user) throw new Error(data.error ?? "구글 로그인을 완료하지 못했어요.");
        onSuccess(data.user);
      } finally {
        // The application's HttpOnly session owns login persistence, not Firebase client storage.
        await signOut(auth).catch(() => undefined);
      }
    } catch (error) {
      setError(firebaseLoginMessage(error));
    } finally {
      setGooglePending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json() as AuthResponse;
      if (!response.ok || !data.user) {
        setError(data.error ?? "잠시 후 다시 시도해 주세요.");
        return;
      }
      setPassword("");
      onSuccess(data.user);
    } catch {
      setError("서버에 연결할 수 없습니다. 로컬 서버를 확인해 주세요.");
    } finally {
      setPending(false);
    }
  }

  function switchMode(next: "login" | "register") {
    setMode(next);
    setError("");
    setPassword("");
  }

  return <div className="auth-stage">
    {(pending||googlePending)&&<AppLoading message={googlePending?"구글 로그인을 기다리고 있어요":mode==="register"?"나만의 식탁을 만들고 있어요":"로그인하고 있어요"}/>}
    <div className="auth-header"><span className="brand"><span className="brand-mark"><span/><span/><span/><span/></span><span>끼니플랜<span className="brand-dot">.</span></span></span><button className="auth-explore-header" type="button" onClick={onExplore}>둘러보기</button></div>
    <div className="auth-content">
      <div className="auth-intro"><span>{admin ? "끼니플랜 관리자" : "나를 위한 한 주의 식탁"}</span><h2>{admin ? <>관리자<br/><em>로그인</em></> : mode === "login" ? <>다시 만나서<br/><em>반가워요.</em></> : <>우리의 첫 주를<br/><em>시작해 볼까요?</em></>}</h2><p>{admin ? "관리자로 등록된 계정으로 로그인해 주세요." : mode === "login" ? "내 계정으로 끼니플랜을 시작해요." : "계정을 만들고 나에게 맞는 한 주를 준비해요."}</p></div>
      <div className="auth-card">
        {!admin && <><button className="google-signin" type="button" onClick={signInWithGoogle} disabled={pending || googlePending}>
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.03 46.98 31.87 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.78-4.59l-7.98-6.19A23.85 23.85 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>
          <span>{googlePending ? "구글로 이동하는 중…" : "Google로 계속하기"}</span>
        </button>
        <p className="google-signin-caption">처음이라면 구글 계정으로 바로 시작해요.</p></>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        {!admin && <div className="auth-divider"><span>또는 이메일로 계속하기</span></div>}
        {!admin && <div className="auth-switch" role="tablist" aria-label="계정 선택"><button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>로그인</button><button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>회원가입</button></div>}
        <form onSubmit={submit}>
          {mode === "register" && <label>이름<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={40} required placeholder="이름을 입력해 주세요"/></label>}
          <label>이메일<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="hello@example.com"/></label>
          <label>비밀번호<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === "register" ? 8 : undefined} required placeholder={mode === "register" ? "8자 이상 입력해 주세요" : "비밀번호를 입력해 주세요"}/></label>
          <button className="auth-submit" type="submit" disabled={pending || googlePending}>{pending ? "처리하는 중…" : mode === "login" ? "로그인하기" : "계정 만들기"}</button>
        </form>
      </div>
      <button className="auth-explore" type="button" onClick={onExplore}>로그인 없이 둘러보기 <span aria-hidden="true">→</span></button>
    </div>
  </div>;
}
