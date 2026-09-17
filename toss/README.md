# 끼니플랜 · 앱인토스

Console app: `kkiniplan`, workspace `41835`. Guest-only first release: budget-based meal recommendations and a local shopping checklist. The existing Next.js website is unchanged.

## Build

From repository root, refresh only the public catalog: `node --env-file=.env.local --import tsx scripts/export-toss-catalog.ts`.

From `toss/`: `npm ci`, `npm run check`, `npm run build`, `npm run bundle`.
Upload `toss/kkiniplan.ait` in the console. SDK 3.4.1 uses `apps-in-toss.config.ts`; no Vercel redirect or embedded external website is used.

`npm run dev` serves local UI at port 5173 with a separate local preview identity. Production uses `User.getAnonymousKey()` and `Device.openURL()`. Both require real Toss QR testing. State is stored only on this device, namespaced by the anonymous key; no cross-device restoration is promised. No production user data or credentials are bundled.

Public prices are a dated snapshot, refreshed by export + rebuild; not live prices. The same recommendation and purchase-quantity logic is shared with the website. A Web Worker keeps recommendation computation off the UI thread. New recommendations keep local stock quantities; planning currently uses the full shopping budget conservatively without subtracting existing stock.

## Release gates

- Console metadata review submitted on 2026-09-17 with logo and 3 screenshots. Console status: under review; response by email within 2 business days.
- Test bundle `20260917-1` uploaded, deployment `01a0afbd-17b8-7704-b612-9a02f0a951f2`, SDK 3.4.1. App-version review has not been requested.
- Actual Toss QR test: anonymous identity, recommendation, external product/search links, persistence after reopening, native back/close, no clipping on iOS/Android.
- Operator explicitly confirmed the required-permits and indemnification declarations before metadata submission in this session. No further legal declarations have been accepted.
- Public launch has not been completed. Do not report the upload or metadata submission as a live release.

`release/` contains actual UI screenshots at console-required 636×1048 and `public/icon.png` is the existing brand icon rendered at 600×600.
