import assert from "node:assert/strict";
import test from "node:test";
import { importProductImage } from "../lib/catalog-storage";

test("image import rejects arbitrary hosts, credentials, insecure URLs and ports", async () => {
  for (const url of ["http://product-image.kurly.com/a.jpg", "https://127.0.0.1/a.jpg", "https://example.com/a.jpg", "https://user:pass@product-image.kurly.com/a.jpg", "https://product-image.kurly.com:8443/a.jpg"]) {
    await assert.rejects(importProductImage(url), /허용된/);
  }
});

test("redirect targets must pass the same host validation", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 302, headers: { location: "https://127.0.0.1/private" } });
  try { await assert.rejects(importProductImage("https://product-image.kurly.com/a.jpg"), /허용된/); }
  finally { globalThis.fetch = original; }
});

test("oversized images and non-image responses are rejected before upload", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("x", { headers: { "content-length": String(9 * 1024 * 1024) } });
    await assert.rejects(importProductImage("https://product-image.kurly.com/a.jpg"), /8MB/);
    globalThis.fetch = async () => new Response("<html>Not an image</html>");
    await assert.rejects(importProductImage("https://product-image.kurly.com/a.jpg"), /JPG/);
  } finally { globalThis.fetch = original; }
});
