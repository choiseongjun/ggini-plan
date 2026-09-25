"use client";

import { getApps, initializeApp } from "firebase/app";
import { browserPopupRedirectResolver, initializeAuth, inMemoryPersistence, type Auth } from "firebase/auth";

let auth: Auth | undefined;

export function firebaseAuth(): Auth {
  if (auth) return auth;
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    // Production's auth helpers are proxied by next.config.ts. Keep the
    // configured Firebase domain for localhost and preview deployments.
    authDomain: typeof window !== "undefined" && window.location.hostname === "gginiplan.kr"
      ? "gginiplan.kr"
      : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
    throw new Error("구글 로그인 설정을 확인해 주세요.");
  }
  const app = getApps().find((entry) => entry.name === "kkiniplan-web") ?? initializeApp(config, "kkiniplan-web");
  auth = initializeAuth(app, { persistence: inMemoryPersistence, popupRedirectResolver: browserPopupRedirectResolver });
  auth.languageCode = "ko";
  return auth;
}

export function firebaseLoginMessage(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  switch (code) {
    case "auth/popup-closed-by-user": return "구글 로그인을 취소했어요. 다시 시작할 수 있어요.";
    case "auth/cancelled-popup-request": return "이미 로그인 창이 열려 있어요. 열린 창에서 계속해 주세요.";
    case "auth/popup-blocked": return "팝업이 차단됐어요. 이 사이트의 팝업을 허용한 뒤 다시 눌러 주세요.";
    case "auth/unauthorized-domain": return "이 주소에서는 구글 로그인을 사용할 수 없어요. 승인된 도메인 설정을 확인해 주세요.";
    case "auth/operation-not-allowed": return "구글 로그인이 아직 활성화되지 않았어요. 로그인 설정을 확인해 주세요.";
    case "auth/network-request-failed": return "네트워크 연결을 확인하고 다시 시도해 주세요.";
    case "auth/account-exists-with-different-credential": return "이 이메일로 가입한 다른 로그인 방법을 이용해 주세요.";
    case "auth/invalid-api-key": return "구글 로그인 설정을 확인해 주세요.";
    default: return code ? "구글 로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요." : error instanceof Error ? error.message : "구글 로그인을 완료하지 못했어요.";
  }
}
