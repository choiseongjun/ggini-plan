import { instructions, schema } from './menu-review-contract';

export type MenuInput = { id: string; name: string; ingredients: { name: string; grams: number }[] };
export type Decision = { id: string; action: 'keep' | 'rename' | 'hold'; name: string; reason: string };

export function validateDecisions(value: unknown, batch: MenuInput[]): Decision[] {
  const items = (value as { items?: Decision[] })?.items;
  if (!Array.isArray(items) || items.length !== batch.length || new Set(items.map(i => i.id)).size !== batch.length) throw Error('Incomplete review');
  for (const item of items) {
    const source = batch.find(row => row.id === item.id);
    if (!source || !['keep', 'rename', 'hold'].includes(item.action) || typeof item.name !== 'string' || !item.name.trim() || typeof item.reason !== 'string') throw Error('Invalid review');
    if (item.action !== 'rename' && item.name !== source.name) throw Error('Unexpected name change');
    if (item.action !== 'keep' && !item.reason.trim()) throw Error('Missing reason');
  }
  return items;
}

export function localEndpoint(base: string): string {
  const url = new URL(base);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw Error('Ollama must run on localhost');
  return url.origin;
}

export async function reviewLocal(batch: MenuInput[], model: string, base = 'http://127.0.0.1:11434') {
  if (/cloud/i.test(model)) throw Error('Cloud models are disabled');
  const messages = [{ role: 'system', content: instructions }, { role: 'user', content: JSON.stringify(batch) }];
  let totalSeconds = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
  const response = await fetch(`${localEndpoint(base)}/api/chat`, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20 * 60_000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, stream: false, think: false, keep_alive: '10m', format: schema,
      options: { temperature: 0, num_ctx: 8192, num_predict: 2048 },
      messages }),
  });
  if (!response.ok) throw Error(`Local Ollama HTTP ${response.status}`);
  const data = await response.json();
  totalSeconds += data.total_duration / 1e9;
  if (!data.done || data.done_reason === 'length') throw Error('Truncated local response');
  try {
    return { items: validateDecisions(JSON.parse(data.message.content), batch), model,
    seconds: Math.round(totalSeconds), outputTokens: data.eval_count,
    tokensPerSecond: Math.round(data.eval_count / (data.eval_duration / 1e9) * 10) / 10 };
  } catch (error) {
    if (attempt === 1) throw error;
    messages.push({ role: 'assistant', content: data.message.content }, { role: 'user', content: `Correct the response: ${error instanceof Error ? error.message : 'Invalid JSON'}. Return all items again. Every hold/rename must have a concrete Korean reason. Keep/hold must preserve the exact input name.` });
  }
  }
  throw Error('Invalid local review');
}
