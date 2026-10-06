import {gzipSync, gunzipSync} from 'node:zlib';

// Next's Data Cache has a 2 MB entry limit. Compression retains all JSON fields.
export function encodeCacheValue(value: unknown): string {
  const encoded = gzipSync(JSON.stringify(value)).toString('base64');
  if (Buffer.byteLength(encoded) > 1_900_000) throw new Error('Compressed data exceeds cache entry limit');
  return encoded;
}

export function decodeCacheValue<T>(encoded: string): T {
  return JSON.parse(gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8')) as T;
}
