import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

test("production indexing, preview exclusion and explicit opt-out", () => {
  for (const [node, vercel, flag, expected] of [
    ["production", "production", "", true],
    ["production", "", "", true],
    ["development", "", "", false],
    ["production", "preview", "true", false],
    ["production", "production", "false", false],
  ] as const) {
    const result = execFileSync(process.execPath, ["--import", "tsx", "-e", "const {indexable}=require('./lib/seo.ts'); const sitemap=require('./app/sitemap.ts').default; console.log(JSON.stringify({indexable,count:sitemap().length}));"], {
      encoding: "utf8", env: { ...process.env, NODE_ENV: node, VERCEL_ENV: vercel, SEO_INDEXING_ENABLED: flag, SITE_URL: "https://gginiplan.kr" },
    });
    assert.deepEqual(JSON.parse(result), { indexable: expected, count: expected ? 5 : 0 });
  }
});
