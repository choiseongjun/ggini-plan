# Kakao login

Kakao Developers app: 1585745 (끼니플랜). Login is enabled. The existing REST key and client secret are used server-side; never expose the secret through NEXT_PUBLIC variables.

Registered callbacks:
- https://gginiplan.kr/api/auth/kakao/callback
- http://localhost:3000/api/auth/kakao/callback
- http://localhost:3001/api/auth/kakao/callback

Set AUTH_URL to the exact serving origin, KAKAO_LOGIN_REST_API_KEY and KAKAO_LOGIN_CLIENT_SECRET. Local development currently uses port 3001. Production must use https://gginiplan.kr. Production environment configuration and deployment are separate from the local implementation.

Run db/kakao-auth.sql once for an existing database (applied to the configured database on 2026-10-23). The standard migration also includes it. Existing Google/Apple accounts are preserved.

Identity is keyed by Kakao member ID. Email permission is not requested. A reserved non-deliverable internal email identifier accommodates the existing database schema; the UI displays 카카오 계정. Providers are not merged by email. New members must accept the service's required consent before account creation.

OAuth state is random, stored hashed for ten minutes, bound to an HttpOnly browser cookie, and consumed once. Tokens are exchanged server-side and not persisted. Optional KAKAO_LOGIN_ADMIN_KEY enables unlinking at Kakao on account deletion; without it, local account deletion still works but the Kakao connection remains. External Kakao unlink webhooks are not configured.

Store WebViews use the existing ggini-google-login bridge to open /app-login in the system browser, where Kakao is available. The existing challenge-bound mobile authorization code flow returns the session to the app. Older app builds show the provider picker again; no native rebuild is required for that flow. Android/iOS end-to-end verification remains necessary.

Validation: node --import tsx --test tests/kakao-auth.test.ts; TypeScript; targeted ESLint; production build. Browser validation reached the actual Kakao consent screen with the correct app and callback. Personal consent/account creation was not performed by the agent.
