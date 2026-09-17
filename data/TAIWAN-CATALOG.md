# Taiwan launch catalog

`taiwan-catalog.json` contains eight individual frozen meals checked against the
Laurel official storefront and its nutrition label images on 2026-09-17 (UTC).
Each selected pack contains exactly one labeled serving. Prices are the displayed
single-pack price, not a multi-buy unit discount. TWD amounts are stored as integer
minor units (NT$72 = 7200). Shipping is not included and availability is unknown.

The manifest keeps product URLs, nutrition label URLs, weights, per-pack nutrition,
and the check timestamp. Label numbers were visually reviewed. Nutrition values
are per **whole pack**, avoiding multiplication of rounded per-100g values.

Run `node scripts/import-taiwan-catalog.mjs` to apply the additive TW market seed
and upsert this reviewed catalog. The script checks product ID collisions and uses
a transaction. It never updates Korean catalog rows or user records.

The web entry is `/tw`, with a dedicated TW-filtered `/api/taiwan/catalog` endpoint.
The Korean and Taiwanese web entries now reuse `AppShell`, `ShoppingPlanner`,
`TodayMeals`, `ShoppingProgress` and `FoodIntake`. `PlannerLocale` selects text,
currency, links and market data. Taiwan uses Traditional Chinese, TWD minor units
and Taipei dates. Its cart and intake share a versioned local store and lock;
partial eating and undo use the same inventory functions as Korea.
Guest data is scoped to `kkiniplan-shopping-draft-v2-guest-TW` and
`kkiniplan-progress-products-guest-TW`. The earlier prototype's
`kkiniplan:TW:zh-TW:v1` remains untouched, but is not read by the shared planner.
Taiwan supports reviewed lunch/dinner prepared meals. Account sync, breakfast and
ingredient recipes are not enabled. Exclusions fail closed for products without
verified ingredient text. Search links are not live price-comparison offers.

The separate `toss/` bundle remains Korean and is not rebuilt for this expansion.

## Expanded retail catalog and SEO

`taiwan-products.json` holds 492 additional seller SKUs, making 500 Taiwan catalog
entries with the eight reviewed Laurel products. Collection uses the current
萬家福 storefront (`online.uni-prosperity.com.tw`, redirected from the former
Carrefour domain), links found in its public food-category pages, and each
product page's Product/Offer JSON-LD. Only positive, unambiguous TWD prices and
HTTPS product/image URLs are accepted. Requests are paced and stop on 403/429.
No login, cart, checkout or disallowed search endpoints are used.

`collect-taiwan-products.mjs` writes the base collection; its
`--protein-supplement` mode collects meat/seafood candidates for a balanced
selection. `import-taiwan-products.mjs` applies the selected manifest to the TW
catalog and seller offers in one transaction, without modifying KR records or
the reviewed serving profiles. Nutrition and meal counts remain unknown until
reviewed. One retail offer is not automatically treated as one meal.

Source metadata lives in `catalog_source_details`. Public routes are
`/tw/products`, `/tw/categories/{ingredients,frozen,ready}`, and
`/tw/products/{id}`. Pages render public facts on the server, link to the original
seller, and include canonical/zh-TW social metadata. Detail pages include escaped
Product and BreadcrumbList JSON-LD. The sitemap lists every TW product using DB
update timestamps; Korean and Taiwanese entry pages have reciprocal hreflang.
No fabricated reviews, ratings, inventory promises or nutritional values are
added. Search indexing requires the website changes to be deployed and crawled.

## Nutrition review, 2026-09-18

`taiwan-nutrition-reviewed.json` adds 131 visually reviewed seller labels to the
eight original meals (139/500 products). The remaining 361 remain unknown, not
zero. `taiwan-nutrition-coverage.json` records checked pages and pending IDs.
An unverified status does not mean the manufacturer publishes no label.

Run `node scripts/collect-taiwan-nutrition.mjs` to cache public detail images and
OCR for review. OCR is evidence discovery only and is never imported directly.
Run `node scripts/import-taiwan-nutrition.mjs` after reviewing the manifest;
its transaction updates only matching TW/TWD catalogue rows. Nine additional
whole-meal profiles are verified (17 recommendation meals in total). A label
serving on dumplings, milk or condiments does not create a meal profile.
`basisUnit: ml` stays in ml and is never treated as grams. Inconsistent label
columns use only the coherent printed basis; ambiguous products remain unknown.
Run `node scripts/audit-taiwan-nutrition.mjs` to refresh the coverage manifest.
