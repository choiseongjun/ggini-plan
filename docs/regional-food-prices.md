# Regional price experiment

Branch: `codex/regional-food-prices`, created from local main `db5dfdc` in a separate worktree. Adpick work is untouched. Development-only route: `/dev/regional-prices` (production returns 404).

## Collected evidence

- KAMIS public retail catalogue: https://www.kamis.or.kr/customer/price/agricultureRetail/catalogue.do
- All visible categories, both grades, all business types, 2026-10-07. National aggregate and all 24 selectable regions were queried through the public UI. Uijeongbu and Gimhae had no rows with current prices. Raw DOM cell text and rowspan/colspan retained in `data/regional-prices/raw/kamis-dom.json`.
- Korea Consumer Agency complete latest published CSV: https://www.data.go.kr/data/15083256/fileData.do
- Downloaded `한국소비자원_생필품 가격 정보_20260828.csv`, CP949, 246,543 observations for August 7 and 28. Portal marks free and unrestricted use. Raw file is retained locally as `data/regional-prices/raw/tprice-20260828.csv`.
- This is NOT all historical data. Local daily collection is now enabled (see the latest collection section). No production database writes or deployments.

## Rebuild

Run `python scripts/build-regional-prices.py` then start Next dev on a spare localhost port. Run parser tests with `python -m unittest discover -s tests -p test_regional_prices.py`.

Raw data and generated preview JSON are ignored by Git. `manifest.json` records provenance and coverage; keep the source files locally to reproduce. The importer intentionally targets the named snapshot dates and validates them; obtain and adapt metadata for a later snapshot.

## Comparability

KAMIS missing prices are null, never zero. Preserve variety, grade, unit, region and survey date. Compare only same-row current price and the explicitly labelled week-before column. Do not interpret count units as mass or treat missing regions as national average.

Tprice groups by exact product name and manufacturer, then uses each product's latest survey date and one observation per store. Average is an unweighted mean across surveyed stores for that exact product/date. Store addresses are absent in the CSV; store region must remain unknown until an authoritative store-code/address dataset is joined. Do not infer region from store-name substrings. Empty sale flags mean unknown, not false. All surveyed offers for each product’s latest date are retained and displayed in a scrollable expanded list; all historical observations remain in the raw CSV.

The search term connects ingredient names across panels without pretending products are equivalent. Recipe suggestions use the names of falling-price KAMIS ingredients only; no total meal cost, cheapest-store, health or complete-basket claim is made.

## Next collection step

KAMIS API guide: https://www.kamis.or.kr/customer/reference/openapi_list.do

Current public-data daily API: https://www.data.go.kr/data/15156057/openapi.do (free, automatic approval; development quota shown as 10,000). Approved credentials and official endpoint specifications are now connected locally; see Live API collection below. Tprice official store metadata/API is also needed for regional joins. Never commit credentials or request URLs containing keys. Backfill in date/page batches, store original source IDs and dates, and checkpoint successful batches before periodic incremental refresh.

## Ingredient connections

`connections.json` is a versioned, reviewed exact-name mapping for 10 ingredients and 5 menu ideas. KAMIS variety constraints exclude unrelated squash; product allowlists exclude baby foods, soups and other prepared foods that merely mention an ingredient. These are ingredient-family relationships, not identical-SKU matches, cooking instructions or proof of cheapest meals. Unmapped products remain searchable but are not silently assigned. `connection-report.json` records coverage and unmapped names. Each product keeps every latest-date store offer, its date, and null address/region with an unverified status. Official store metadata has not been obtained; regional store filtering is not enabled.

## Price-aware recommendation experiment

`lib/regional-price-recommendations.ts` links 27 reviewed ingredient groups to the 30 existing source recipes using exact source ingredient names. It does not infer meat cuts, cooked/raw substitutions or missing egg prices. Only same-row seven-day comparisons of the selected region, positive prices and reference grade 상품 qualify. Observations older than seven days or in the future contribute zero. A deterministic variety/unit series avoids selecting the largest discount. Reasons include region, dates, variety, grade and unit. Bonuses are capped at three and break ties only after all existing pantry, priority, history, favorite and effort rules.

`pantrySourceRecommendations` accepts an optional price context; callers without it keep the original order. The local preview passes this context and allows toggling price signals, entering owned ingredients, and comparing against baseline ranks. Production callers are not enabled. No cost estimate is replaced, no push notifications are sent, and the local daily automation is enabled while the prepared GitHub workflow has not been published.

## Local store maps

Each store offer has an on-demand map. The development-only `/api/dev/store-location` endpoint accepts only names present in the collected dataset, requires a same-host loopback Origin, uses the existing Kakao Local REST credential server-side, and caches results in memory for one hour. Naver Maps renders returned coordinates using the existing public map client ID. No personal geolocation is requested. A unique full-name match (spaces/legal corporation marker ignored) is labelled as a name match; different/ambiguous names remain candidates. Invalid coordinates and unrelated categories are excluded. Provider addresses are displayed with a place/detail link; they do not constitute a verified join to the original price-store identity and do not enable regional filtering. Unknown/failed lookups remain explicitly unavailable. No production endpoint or deployment is enabled. Local ignored `.env.local` contains map/search credentials and the KAMIS service key needed for this preview.

## Live API collection (2026-10-07)

The approved public-data API is `https://apis.data.go.kr/B552845/perDay/price`. The official attached XLSX specification requires dates in YYYYMMDD and a category and item code for every request. Empty or omitted category/item filters returned success with zero rows and must never be treated as a completed collection. `api-items.json` contains all 136 official item-code pairs extracted from that attachment. Retail is code 01. Responses can be wrapped in `response`; pages are capped at 1,000 rows.

Run `npm run prices:collect` locally. This collects a 15-calendar-date window ending today in Asia/Seoul, with three bounded retries, complete pagination and validation of returned item/date/channel codes. Failure or an entirely empty result preserves the previous API snapshot. Raw records retain market identity and source timestamps. The importer shows the latest actually available date, averages valid positive prices by region/item/variety/grade/unit, and only calculates the seven-day change when the same market-code set is available on both dates. Missing dates and changed samples do not produce a discount. This calculated average is labelled separately from the published KAMIS website aggregate.

The importer prefers a complete API snapshot over the earlier DOM snapshot. Tprice now prefers its separately collected latest official survey; the August CSV is retained as a historical fallback. No hidden substitution of stale web values for missing API values occurs. `KAMIS_SERVICE_KEY` is in ignored local configuration only. `.github/workflows/kamis-prices.yml` prepares weekday 19:30 KST collection and uploads the raw/normalized snapshot as a GitHub artifact; it is NOT running remotely until pushed to the default branch and the repository secret is configured. It does not update the production database or deploy the app.


## Latest store collection (2026-10-07)

`python scripts/collect-tprice.py` discovers the newest available survey year/month/day from the official price.go.kr public date endpoints. The old linked OpenAPI portal entry returned a not-found page, so this collector uses the same public form and paginated HTML as the official website, with TLS verification enabled through system curl. It discovers every top-level category, retrieves 200 offers per page with three workers and bounded retries, and verifies exact total counts and unique source product/store IDs before replacing the last good snapshot. Partial categories are checkpointed per survey and collection day for recovery. The collected date is the published survey date, not today's retrieval date. A complete snapshot less than 20 hours old can be reused; otherwise the same survey is refreshed to pick up revisions.

The latest offered survey on 2026-10-07 was 2026-09-25. Source product/store IDs and reported store regions are retained. Products are grouped by official product ID, not guessed name/manufacturer equivalence. The source does not provide manufacturer or promotion flags in these rows; these remain explicitly unknown. Store regions are displayed, while product averages cover nationwide observed stores. Historical August CSV remains a separate fallback and is never mixed into the latest survey.

`npm run prices:collect` now refreshes KAMIS, then store prices, then rebuilds the local preview. A thread-attached Codex automation is ACTIVE daily at 20:30 Asia/Seoul; it runs this command in this worktree and only reports a newly available survey or a failure requiring attention. Local execution requires this computer and Codex to be available. The GitHub workflow was also extended to collect both sources, but is still unpushed/inactive remotely. No production deployment.

## Server publication and home recommendation

The daily GitHub workflow runs at 20:30 KST on a standard Ubuntu runner, validates both full snapshots and publishes them transactionally into Supabase `regional_price_snapshots`. RLS is enabled without public API policies; existing server database credentials access it. Only the latest snapshot per source is retained. Backdated data is rejected and a failed transaction preserves the previous pair. No Actions artifacts are retained. Runtime and database quotas remain account-wide.

Home and pantry recommendation requests accept an optional explicitly selected price region. The server reads KAMIS with a five-minute cache and a two-second response deadline, then uses exact ingredient names and the existing seven-day freshness validation. Missing/failed data contributes no bonus. Home catalogue recipes receive a maximum three-point personalization bonus within existing hard eligibility constraints; pantry recipes use it as a final tie-breaker. Reasons include the source series/date; recipe cost estimates are not replaced. Store data is stored for future shopping comparisons and is not misrepresented as a menu-cost calculation.
