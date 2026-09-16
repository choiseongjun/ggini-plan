import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";

export function firebaseAdminAuth() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId || process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error("Firebase production token verification is not configured");
  const name = `kkiniplan-auth-${projectId}`;
  const app = getApps().find((entry) => entry.name === name) ?? initializeApp({ projectId }, name);
  // Signature verification fetches Google's public certificates; no private key is required.
  return getAuth(app);
}

export function firebaseGoogleIdentity(token: DecodedIdToken) {
  const subject = token.firebase?.identities?.["google.com"]?.[0];
  const now = Math.floor(Date.now() / 1000);
  if (token.firebase?.sign_in_provider !== "google.com" || typeof subject !== "string" || !subject ||
      token.email_verified !== true || typeof token.email !== "string" || token.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(token.email) ||
      !Number.isFinite(token.auth_time) || token.auth_time > now + 60 || now - token.auth_time > 300) {
    throw new Error("Invalid Google sign-in claims");
  }
  // The verified Google subject is shared with the existing OAuth account mapping.
  return { subject, email: token.email.trim().toLowerCase(), name: (typeof token.name === "string" && token.name.trim() || token.email.split("@")[0]).slice(0, 80) };
}
