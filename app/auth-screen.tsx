"use client";

import { useState, type FormEvent } from "react";
import { AppLoading } from "./app-loading";
import type { PublicUser } from "../lib/auth";
import { GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { firebaseAuth, firebaseLoginMessage } from "../lib/firebase-client";
import { MemberConsentFields, emptyConsent } from './member-consent';
import { MEMBER_POLICY_VERSION } from '../lib/member-policy';
import './apple-signin.css';
import { PolicyLinks } from './policy-links';

type AuthResponse = { user?: PublicUser; error?: string; code?: string };

export function AuthScreen({ onSuccess, onExplore, initialError = "", admin = false, review = false }: { onSuccess: (user: PublicUser) => void; onExplore: () => void; initialError?: string; admin?: boolean; review?: boolean }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [pending, setPending] = useState(false);
  const [socialPending, setSocialPending] = useState(false);
  const [socialName,setSocialName]=useState("Google");
  const [consent, setConsent] = useState(emptyConsent);
  const consentComplete = consent.terms && consent.privacy && consent.age14;
  const consentPayload = { ...consent, version: MEMBER_POLICY_VERSION };

  async function signInWithSocial(kind: 'google' | 'apple' = 'google') {
    const label=kind==='apple'?'Apple':'Google';
    setSocialName(label);
    const bridge=(window as Window & {ReactNativeWebView?:{postMessage:(message:string)=>void}}).ReactNativeWebView;
    // Keep the existing bridge message for older builds. The system-browser login
    // screen supports both providers; Apple must not open a popup inside WKWebView.
    if(bridge){bridge.postMessage(JSON.stringify({type:'ggini-google-login',provider:kind}));return;}
    if (mode === 'register' && !consentComplete) { setError('회원가입 필수 동의 항목을 확인해 주세요.'); return; }
    setSocialPending(true);
    setError("");
    try {
      const auth = firebaseAuth();
      const provider = kind==='apple'?new OAuthProvider('apple.com'):new GoogleAuthProvider();
      if(kind==='apple'){provider.addScope('email');provider.addScope('name');provider.setCustomParameters({locale:'ko_KR'});}else provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(auth, provider);
      try {
        const response = await fetch("/api/auth/firebase", {
          method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: await credential.user.getIdToken(), consent: consentPayload }),
        });
        const data = await response.json() as AuthResponse;
        if (data.code === 'consent_required') {
          setMode('register');
          setError(`처음 이용하는 ${label} 계정이에요. 필수 항목에 동의한 후 ${label}로 계속하기를 다시 눌러 주세요.`);
          return;
        }
        if (!response.ok || !data.user) throw new Error(data.error ?? "구글 로그인을 완료하지 못했어요.");
        onSuccess(data.user);
      } finally {
        // The application's HttpOnly session owns login persistence, not Firebase client storage.
        await signOut(auth).catch(() => undefined);
      }
    } catch (error) {
      setError(firebaseLoginMessage(error).replaceAll('구글',label).replaceAll('Google',label));
    } finally {
      setSocialPending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === 'register' && !consentComplete) { setError('회원가입 필수 동의 항목을 확인해 주세요.'); return; }
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name, email, password, ...(mode === 'register' ? { consent: consentPayload } : {}) }),
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


  return <div className="auth-stage">
    {(pending||socialPending)&&<AppLoading message={socialPending?`${socialName} 로그인을 기다리고 있어요`:mode==="register"?"나만의 식탁을 만들고 있어요":"로그인하고 있어요"}/>}
    <div className="auth-header"><span className="brand"><span className="brand-mark"><span/><span/><span/><span/></span><span>끼니플랜<span className="brand-dot">.</span></span></span><button className="auth-explore-header" type="button" onClick={onExplore}>둘러보기</button></div>
    <div className="auth-content">
      <div className="auth-intro"><span>{admin ? "끼니플랜 관리자" : "내 식사에서 건강을 찾다"}</span><h2>{admin ? <>관리자<br/><em>로그인</em></> : mode === "login" ? <>다시 만나서<br/><em>반가워요.</em></> : <>우리의 첫 주를<br/><em>시작해 볼까요?</em></>}</h2><p>{admin ? "관리자로 등록된 계정으로 로그인해 주세요." : mode === "login" ? "내 계정으로 끼니플랜을 시작해요." : "계정을 만들고 내게 필요한 영양과 한 끼를 찾아봐요."}</p></div>
      <div className="auth-card">
        {review && <p>App review / 심사용 로그인<br/>스토어 콘솔에 제공된 테스트 계정을 입력하세요. 일반 사용자와 같은 기능을 이용하며 테스트용 기록만 사용해 주세요.</p>}
        {!admin && !review && mode === 'register' && <MemberConsentFields value={consent} onChange={setConsent} disabled={pending || socialPending}/>}
        {!admin && !review && <><button className="google-signin" type="button" onClick={()=>void signInWithSocial()} disabled={pending || socialPending}>
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.03 46.98 31.87 46.98 24.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.78-4.59l-7.98-6.19A23.85 23.85 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>
          <span>{socialPending && socialName==='Google' ? "구글로 이동하는 중…" : "Google로 계속하기"}</span>
        </button>
        <button className="apple-signin" type="button" onClick={()=>void signInWithSocial('apple')} disabled={pending||socialPending}>
          <svg className="apple-signin-logo" width="20" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M17.05 12.04c.03 3.27 2.87 4.36 2.9 4.37-.02.08-.45 1.55-1.49 3.07-.9 1.31-1.83 2.62-3.3 2.65-1.44.03-1.91-.86-3.56-.86-1.65 0-2.17.83-3.54.89-1.42.05-2.5-1.42-3.41-2.73-1.86-2.68-3.28-7.58-1.37-10.89.95-1.64 2.64-2.68 4.47-2.71 1.4-.03 2.72.95 3.57.95.85 0 2.44-1.18 4.11-1.01.7.03 2.68.28 3.95 2.14-.1.06-2.36 1.37-2.33 4.13ZM14.34 4.1c.76-.92 1.27-2.2 1.13-3.47-1.1.04-2.44.73-3.23 1.65-.71.82-1.34 2.13-1.17 3.38 1.23.1 2.49-.63 3.27-1.56Z"/></svg>
          <span>{socialPending && socialName === 'Apple' ? 'Apple로 이동하는 중…' : 'Apple로 계속하기'}</span>
        </button>
        <p className="google-signin-caption">처음 이용한다면 가입 동의를 확인한 뒤 계정을 만들어요.</p></>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        {(admin || review) && <form onSubmit={submit}>
          {mode === "register" && <label>이름<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={40} required placeholder="이름을 입력해 주세요"/></label>}
          <label>이메일<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="hello@example.com"/></label>
          <label>비밀번호<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === "register" ? 8 : undefined} required placeholder={mode === "register" ? "8자 이상 입력해 주세요" : "비밀번호를 입력해 주세요"}/></label>
          <button className="auth-submit" type="submit" disabled={pending || socialPending}>{pending ? "처리하는 중…" : mode === "login" ? "로그인하기" : "계정 만들기"}</button>
        </form>}
      </div>
      <button className="auth-explore" type="button" onClick={onExplore}>로그인 없이 둘러보기 <span aria-hidden="true">→</span></button>
      <PolicyLinks/>
      {/* Store reviewers are told to tap this exact label; keep it discreet for everyone else. */}
      {!admin && !review && <a className="auth-review-link" href="/review-login">심사용 로그인 / App review</a>}
    </div>
  </div>;
}
