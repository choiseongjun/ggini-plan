# Shopping search and retailer deals

The existing `/deals` page combines two explicitly labelled sources:

- `naver-shopping`: current search prices and merchant names; no verified discount,
  original price, shipping charge, stock or coupon claims. `hprice` is never a reference price.
- `kurly-public`: existing public-page collector, respecting robots rules; only its
  unambiguous purchasable discounted offers receive discount percentages.

The existing daily collector runs both sources under its existing enable switch and lock.
Manual runs make at most two Naver queries of 20 results, rotating through eight food queries.
Daily runs refresh all eight queries (up to 160 accepted results) so the 36-hour freshness window remains useful.
An upstream authentication/rate error stops Naver requests without blocking Kurly.
Admin `/admin/deals` can collect either source or both and shows errors in the run history.
Search results absent from a later query are not called sold out; after 36 hours they
become stale and are hidden by the default public filter. Manual listings are not overwritten.

Set server-only `NAVER_SHOPPING_CLIENT_ID` and `NAVER_SHOPPING_CLIENT_SECRET` with
shopping-search permission. Do not fall back to the existing `NAVER_SEARCH_*` HUB keys.
The documented endpoint is `https://openapi.naver.com/v1/search/shop.json`.
API HUB image/local-search credentials do not imply access to this endpoint;
the current HUB documentation does not list a shopping-search endpoint. On 2026-10-07,
the signed-in console's existing gginiplan app and complete application-registration
API list confirmed Shopping Insight is available but Shopping Search is not listed.
Never switch to an invented `/search/v1/shop` endpoint or silently publish sample products.

References:
- https://developers.naver.com/docs/serviceapi/search/shopping/shopping.md
- https://api.ncloud-docs.com/docs/naver-api-hub-overview

Validation: `node --import tsx --test tests/naver-shopping-deals.test.ts tests/food-deal-collector.test.ts tests/food-deals.test.ts`
