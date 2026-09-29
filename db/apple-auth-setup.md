# Apple web login setup

- Enable Apple in Firebase Authentication and configure the Apple Services ID, Team ID, Key ID and private key through the console. Never commit the private key.
- Register the web domain and exact Firebase auth callback URL for that Services ID in Apple Developer. Production uses `https://gginiplan.kr/__/auth/handler`; verify any other auth domain used by local development separately.
- Apply `db/apple-auth.sql` transactionally to the target database before releasing the code (also included in `scripts/migrate.mjs`).
- Test first-time consent, returning sign-in, private relay email and existing-email conflicts.
- This change implements web popup authentication. The Expo native authentication bridge still only supports Google; native Apple authentication needs its own implementation and device verification.

Verification on 2026-09-29: TypeScript passed. Apple Services ID kr.gginiplan.web is configured for gginiplan.kr and ggini-plan.firebaseapp.com with their /__/auth/handler callbacks. Firebase Apple provider configuration was saved with Team ID 2RURMCLKF2 and Key ID A788PXCJ3A. The previous unused key 9865J9F6A3 was revoked. The downloaded .p8 file is stored locally at the repository root and ignored by Git. Applied the narrow Apple provider constraint migration to the configured database. All five Firebase API/database integration tests passed (external token verification mocked for success cases). Firebase createAuthUri returns the correct Services ID and callback; Apple authorization page opens successfully with those parameters. Actual user Apple popup completion remains unverified. No code deployment was performed.
