# 끼니플랜 · 앱인토스

Console app: `kkiniplan`, workspace `41835`.

## Next release: 0.2.1 (2026-10-07)

Adds Toss console analytics (`src/track.ts`, SDK `Analytics`). Sandbox/dev only prints `[track]` to the console. Params carry menu/product IDs, counts and enum choices only — no body data or free text; the SDK adds the anonymous key.

- Screens: `setup_meals`, `setup_cooking`, `plan`, `cart`
- Events: `app_opened` (restored, catalog), `recommendation_completed`, `menu_swapped` (from/to product id), `recommendation_failed` (reason: invalid_conditions/no_menu/timeout/error)
- Clicks: `seller_link_clicked` (product_id, host), `price_search_clicked`, `recipe_method_opened`, `recipe_video_clicked`, `item_prepared`, `feedback_clicked`, `plan_reset`

Bundle `release/kkiniplan-20261007.ait` (deployment `01a113d4-d18b-78f6-b2c6-21adc209e7ab`), catalog re-exported 2026-10-07. Not uploaded yet; uploading and review submission are done in the console. If 0.2.0 is still under review, wait for its result before uploading.

## Previous release: 0.2.0 (2026-09-28)

The mini-app now shares the current website's recipe catalog, recommendation logic, cooking-effort picker, per-meal side-dish picker and goal picker. It supports selected breakfast/lunch/dinner slots, 1–4 people, meal counts, exclusions, optional average ingredient-cost limits, menu replacement, recipe ingredient quantities and cooking notes, and a consolidated shopping list with local stock tracking.

Recipe videos open an external YouTube search; the website's embedded video API is not bundled. Recipe notes and prices are estimates, not official cooking instructions or live retailer prices. Shopping displays usage cost separately from whole-package purchase estimates. Basic pantry items are listed separately when their price is excluded.

## Build

From repository root, refresh the public catalog:
`node --env-file=.env.local --import tsx scripts/export-toss-catalog.ts`

From `toss/`: `npm ci`, `npm run check`, `npm run build`, `npm run bundle`.
Upload `toss/kkiniplan.ait` in the console. The dated copy is `release/kkiniplan-20260928.ait`. SDK 3.4.1 uses `apps-in-toss.config.ts`; website deployments do not update this bundle.

`npm run dev` serves local UI at port 5173 with a separate preview identity. Production uses `User.getAnonymousKey()` and `Device.openURL()`. State is stored only on this device, namespaced by the anonymous key; no account or cross-device restoration is promised. Old plans whose menu IDs are no longer available prompt regeneration while retaining compatible ingredient stock. No production user data or credentials are bundled.

## Validation and release status

- TypeScript check, scoped ESLint, five planner/persistence tests, Vite production build and AIT bundle build passed.
- Mobile browser verified recommendation, cooking notes, shopping cost updates and stock restoration after reload.
- Uploaded successfully on 2026-09-28 at 08:03 KST as console version `20260928-2`, deployment `01a0e518-3672-7e14-a248-1e03c529b80e`. SDK version: 3.4.1. On 2026-10-07, the console was directly verified to show `현재 출시됨`, released 2026-09-28 at 10:11 KST.
- Actual Toss QR checks: anonymous identity, external links, reopen persistence, native back/close and iOS/Android layout.
- Previous version `20260917-1` was released 2026-09-28 at 07:43 KST and is available for rollback. Historical deployment: `01a0afbd-17b8-7704-b612-9a02f0a951f2`. The current public version is `20260928-2`; no further launch action is pending for this version.
- No new legal declarations have been accepted in preparing this release.

## Logo correction

Use `release/app-logo-square-600.png` for the reported rounded-background rejection. The opaque square 600×600 PNG is also included as `public/icon.png`. Console replacement and approval remain unconfirmed.

The logo was edited using ImageGen to extend the cream background to all square corners while preserving its four-circle composition. Previous screenshots in this folder describe the old version and must not be used to represent version 0.2.0.


## Review submitted

On 2026-09-28, version 20260928-2 was submitted for review with the current feature release notes after the operator reported testing complete and requested launch. The console initially confirmed 검토 중. A direct console check on 2026-10-07 confirmed that this version was subsequently released on 2026-09-28 at 10:11 KST and is currently public. The earlier pending-review status in this document is superseded by that confirmation.
