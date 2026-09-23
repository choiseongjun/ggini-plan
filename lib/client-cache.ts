// In-memory cache for large GET responses that every tab re-requests on mount.
// Each tab is its own route, so navigating remounts the page; without this the ~MB catalog
// payloads were downloaded (behind a full-screen loader) on every visit to 홈·마이·달력.
// Lives only for this browser session; mutations call invalidateJson() so edits show up at once.
export type Json = Awaited<ReturnType<Response["json"]>>;
type Entry = { at: number; promise: Promise<unknown> };
const store = new Map<string, Entry>();

export function hasFreshJson(key: string, ttl: number) {
  const entry = store.get(key);
  return Boolean(entry && Date.now() - entry.at < ttl);
}

export function cachedJson<T = Json>(url: string, { key = url, ttl = 5 * 60_000 }: { key?: string; ttl?: number } = {}): Promise<T> {
  const entry = store.get(key);
  if (entry && Date.now() - entry.at < ttl) return entry.promise as Promise<T>;
  // Deliberately not tied to a caller's AbortSignal: several mounts share one request.
  const promise = fetch(url, { cache: "no-store" }).then(async r => {
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error ?? "불러오지 못했어요.");
    return data as T;
  });
  store.set(key, { at: Date.now(), promise });
  promise.catch(() => { if (store.get(key)?.promise === promise) store.delete(key); });
  return promise;
}

export function primeJson(key: string, data: unknown) {
  store.set(key, { at: Date.now(), promise: Promise.resolve(data) });
}

/** Drops every entry whose key starts with `prefix` (all entries when omitted). */
export function invalidateJson(prefix = "") {
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key);
}
