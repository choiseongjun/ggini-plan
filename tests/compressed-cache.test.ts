import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {test} from 'node:test';
import {encodeCacheValue, decodeCacheValue} from '../lib/compressed-cache';

test('multi-megabyte catalog fits the cache without losing nutrition, locale or null fields', () => {
  const products = Array.from({length: 2700}, (_, id) => ({
    id: String(id), name: '계란과 채소', locale: 'ko-KR', price: 2450,
    detail: '상품 설명과 영양 정보 '.repeat(80), allergens: ['egg'],
    proteinG: 12.3456789, sodiumMg: 689, productImageUrl: null,
    updatedAt: '2026-10-06T00:00:00.000Z',
  }));
  assert.ok(Buffer.byteLength(JSON.stringify(products)) > 2_000_000);
  const encoded = encodeCacheValue(products);
  assert.ok(Buffer.byteLength(encoded) < 1_900_000);
  assert.deepEqual(decodeCacheValue(encoded), products);
});

test('oversized and corrupt cache values fail explicitly', () => {
  assert.throws(() => encodeCacheValue(randomBytes(2_000_000).toString('base64')), /exceeds cache entry limit/);
  assert.throws(() => decodeCacheValue('invalid'));
});
