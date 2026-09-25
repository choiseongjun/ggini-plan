# Basic product analytics

Project: https://us.posthog.com/project/628114
Dashboard: https://us.posthog.com/project/628114/dashboard/2134747

Set NEXT_PUBLIC_POSTHOG_KEY (public project token) and NEXT_PUBLIC_POSTHOG_HOST, then rebuild. Only gginiplan.kr and www.gginiplan.kr send events; local and preview visits do not pollute production data. Missing configuration is a no-op.

Events: page_viewed, recommendation_started/completed/failed, menu_details_opened, menu_swapped, record_method_selected, meal_recorded, photo_analysis_started/completed/failed. A completed photo analysis has outcome recorded or unrecognized; transport/API failures emit failed. Duration includes client preparation, upload, analysis and saving. meal_recorded is successful recording, not an edit or deletion; adding multiple independent food entries can count multiple times.

Retention uses an anonymous browser identifier persisted in localStorage. It cannot link devices or recover identity after site data is cleared. It does not identify accounts. D1/D7 need future observation days; browser/ad-blocking can omit events.

Only a small allowlist survives before_send: anonymous IDs, named screen/method/outcome/failure, duration_ms and photo_count. No photos, food names, nutrition, body data, email, account ID, free-text errors, query strings or referrers. No autocapture, replay, heatmaps, surveys, automatic exception capture, feature flags or performance/network capture. Respects Do Not Track. IP-based geolocation is disabled; the vendor still receives network traffic.

Validation: node --import tsx --test tests/analytics-events.test.ts
