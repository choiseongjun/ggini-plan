import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";

export function firebaseAdminAuth() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId || process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error("Firebase production token verification is not configured");
  const name = `kkiniplan-auth-${projectId}`;
  const app = getApps().find((entry) => entry.name === name) ?? initializeApp({ projectId }, name);
  // Signature verification fetches Google's public certificates; no private key is required.
  return getAuth(app);
}

// Uses the FCM service account so account deletion can remove the Firebase user
// without a fresh popup token (popups are unavailable inside the iOS WebView).
function firebaseCredentialedAuth() {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  const service = JSON.parse(raw);
  if (service.project_id !== process.env.FIREBASE_PROJECT_ID) throw new Error("Firebase project mismatch");
  const name = "ggini-admin-auth";
  const app = getApps().find((entry) => entry.name === name) ?? initializeApp({ credential: cert(service), projectId: service.project_id }, name);
  return getAuth(app);
}

export async function deleteFirebaseIdentity(provider: "google" | "apple", subject: string) {
  const auth = firebaseCredentialedAuth();
  if (!auth) return false;
  try {
    const user = await auth.getUserByProviderUid(provider === "apple" ? "apple.com" : "google.com", subject);
    await auth.deleteUser(user.uid);
  } catch (error) {
    if ((error as { code?: string })?.code !== "auth/user-not-found") throw error;
  }
  return true;
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

export function firebaseAppleIdentity(token: DecodedIdToken) {
  const subject = token.firebase?.identities?.['apple.com']?.[0];
  const now = Math.floor(Date.now() / 1000);
  if (token.firebase?.sign_in_provider !== 'apple.com' || typeof subject !== 'string' || !subject || subject.length > 255 ||
      token.email_verified !== true || typeof token.email !== 'string' || token.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(token.email) ||
      !Number.isFinite(token.auth_time) || token.auth_time > now + 60 || now - token.auth_time > 300) {
    throw new Error('Invalid Apple sign-in claims');
  }
  // Apple may omit the name after the initial authorization. Never expose a relay address as the display name.
  return { subject, email: token.email.trim().toLowerCase(), name: (typeof token.name === 'string' && token.name.trim() || '끼니 사용자').slice(0, 80) };
}
