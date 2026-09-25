import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localEndpoint, validateDecisions, reviewLocal } from '../scripts/ollama-menu-client';

test('local reviewer rejects remote endpoints and cloud models', async () => {
  assert.equal(localEndpoint('http://127.0.0.1:11434'), 'http://127.0.0.1:11434');
  for (const url of ['https://ollama.com', 'http://example.com', 'http://localhost@evil.test', 'http://localhost/proxy']) assert.throws(() => localEndpoint(url));
  await assert.rejects(reviewLocal([], 'qwen:cloud'), /Cloud models/);
});

test('review must cover every menu and preserve identity unless explicitly renamed', () => {
  const batch = [{ id: '1', name: '두부구이', ingredients: [{ name: '두부', grams: 150 }] }];
  const item = { id: '1', name: '두부구이', action: 'keep', reason: '' };
  assert.equal(validateDecisions({ items: [item] }, batch).length, 1);
  assert.throws(() => validateDecisions({ items: [] }, batch));
  assert.throws(() => validateDecisions({ items: [{ ...item, id: '2' }] }, batch));
  assert.throws(() => validateDecisions({ items: [{ ...item, name: '사과' }] }, batch));
  assert.throws(() => validateDecisions({ items: [{ ...item, action: 'hold' }] }, batch));
});

test('local failure does not fall back to a paid API', async t => {
  const requests: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    requests.push(url);
    return new Response('{}', { status: 503 });
  });
  await assert.rejects(reviewLocal([], 'qwen3.5:9b'), /Local Ollama HTTP 503/);
  assert.deepEqual(requests, ['http://127.0.0.1:11434/api/chat']);
});

test('incomplete model generation cannot become an approved review', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ done: true, done_reason: 'length', message: { content: '{"items":[]}' } })));
  await assert.rejects(reviewLocal([], 'qwen3.5:9b'), /Truncated local response/);
});

test('missing reason is repaired locally once before accepting the verdict', async t => {
  let calls = 0;
  const batch = [{ id: '1', name: '모호한 메뉴', ingredients: [] }];
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return new Response(JSON.stringify({ done: true, done_reason: 'stop', total_duration: 1e9, eval_count: 10, eval_duration: 1e9,
      message: { content: JSON.stringify({ items: [{ id: '1', action: 'hold', name: '모호한 메뉴', reason: calls === 1 ? '' : '재료 정보 없음' }] }) } }));
  });
  const result = await reviewLocal(batch, 'qwen3.5:9b');
  assert.equal(calls, 2);
  assert.equal(result.items[0].reason, '재료 정보 없음');
  assert.equal(result.seconds, 2);
});
