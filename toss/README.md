# 끼니플랜 · 앱인토스

Console app: `kkiniplan`, workspace `41835`.

## Current release: 0.2.0 (2026-09-28)

The mini-app now shares the current website's recipe catalog, recommendation logic, cooking-effort picker, per-meal side-dish picker and goal picker. It supports selected breakfast/lunch/dinner slots, 1–4 people, meal counts, exclusions, optional average ingredient-cost limits, menu replacement, recipe ingredient quantities and cooking notes, and a consolidated shopping list with local stock tracking.

Recipe videos open an external YouTube search; the website's embedded video API is not bundled. Recipe notes and prices are estimates, not official cooking instructions or live retailer prices. Shopping displays usage cost separately from whole-package purchase estimates. Basic pantry items are listed separately when their price is excluded.

## Build

From repository root, refresh the public catalog:
`node --env-file=.env.local --import tsx scripts/export-toss-catalog.ts`

From `toss/`: `npm ci`, `npm run check`, `npm run build`, `npm run bundle`.
Upload `toss/kkiniplan.ait` in the console. The dated copy is `release/kkiniplan-20260928.ait`. SDK 3.4.1 uses `apps-in-toss.config.ts`; website deployments do not update this bundle.

`npm run dev` serves local UI at port 5173 with a separate preview identity. Production uses `User.getAnonymousKey()` and `Device.openURL()`. State is stored only on this device, namespaced by the anonymous key; no account or cross-device restoration is promised. Old plans whose menu IDs are no longer available prompt regeneration while retaining compatible ingredient stock. No production user data or credentials are bundled.

## Validation and remaining release steps

- TypeScript check, scoped ESLint, five planner/persistence tests, Vite production build and AIT bundle build passed.
- Mobile browser verified recommendation, cooking notes, shopping cost updates and stock restoration after reload.
- Uploaded successfully on 2026-09-28 at 08:03 KST as console version `20260928-2`, deployment `01a0e518-3672-7e14-a248-1e03c529b80e`. Console build completed with SDK 3.4.1 and status `검토 필요`. Native QR verification, review submission and public release of this version remain pending.
- Actual Toss QR checks: anonymous identity, external links, reopen persistence, native back/close and iOS/Android layout.
- The console currently serves old version `20260917-1`, released 2026-09-28 at 07:43 KST. Historical deployment: `01a0afbd-17b8-7704-b612-9a02f0a951f2`. Uploading the new version does not replace the public release automatically.
- No new legal declarations have been accepted in preparing this release.

## Logo correction

Use `release/app-logo-square-600.png` for the reported rounded-background rejection. The opaque square 600×600 PNG is also included as `public/icon.png`. Console replacement and approval remain unconfirmed.

The logo was edited using ImageGen to extend the cream background to all square corners while preserving its four-circle composition. Previous screenshots in this folder describe the old version and must not be used to represent version 0.2.0.


## Review submitted

On 2026-09-28, version 20260928-2 was submitted for review with the current feature release notes after the operator reported testing complete and requested launch. Console confirmed 검토 중 and an email result within three business days. Public release still serves 20260917-1; the new version cannot yet be launched while review is pending.
