import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { getPool } from '../lib/db';
import { instructions, schema } from './menu-review-contract';
import { reviewLocal, validateDecisions, type MenuInput, type Decision } from './ollama-menu-client';

const model = process.env.OLLAMA_MENU_MODEL || 'qwen3.5:9b';
const allRequested = process.argv.includes('--all');
const directory = '.cache/menu-review-ollama';
const output = 'artifacts/menu-review/ollama-review.json';

async function main() {
  const tagsResponse = await fetch('http://127.0.0.1:11434/api/tags', { redirect: 'error', signal: AbortSignal.timeout(10_000) });
  if (!tagsResponse.ok) throw Error('Cannot read local Ollama models');
  const tags = await tagsResponse.json() as { models: { name: string; digest: string; remote_host?: string }[] };
  const installed = tags.models.find(item => item.name === model);
  if (!installed) throw Error(`Install the local model first: ollama pull ${model}`);
  if (installed.remote_host || /cloud/i.test(model)) throw Error('Cloud models are disabled');
  const pool = getPool();
  let catalog: MenuInput[];
  try {
    const { rows } = await pool.query('SELECT food_code,target_name,ai_ingredients FROM recipe_optimizer_results ORDER BY food_code');
    catalog = rows.map(row => ({ id: row.food_code, name: row.target_name,
      ingredients: (row.ai_ingredients?.ingredients ?? []).map((i: { name: string; grams: number }) => ({ name: i.name, grams: i.grams })) }));
  } finally { await pool.end(); }
  // Curated examples include familiar food, unclear names and ingredient mismatches.
  const sampleIds = ['AI-e619d8b4beba', 'AI-57c2a41b12c6', 'D406-334000000-0001'];
  const sample = [...['두부구이', '김치찌개', '비빔밥'].flatMap(name => catalog.filter(row => row.name === name).slice(0, 1)),
    ...catalog.filter(row => sampleIds.includes(row.id))];
  const selected = allRequested ? catalog : sample;
  if (!selected.length) throw Error('No menu data');
  fs.mkdirSync(directory, { recursive: true });
  fs.mkdirSync('artifacts/menu-review', { recursive: true });
  const results: (MenuInput & { decision: Decision })[] = [];
  for (let offset = 0; offset < selected.length; offset += 3) {
    const batch = selected.slice(offset, offset + 3);
    const hash = createHash('sha256').update(JSON.stringify({ version: 1, model, digest: installed.digest, instructions, schema, batch })).digest('hex');
    const cachePath = `${directory}/${hash}.json`;
    const cached = fs.existsSync(cachePath);
    console.log(`Reviewing ${offset + 1}-${offset + batch.length}/${selected.length} (${model}${cached ? ', cached' : ''})`);
    const result = cached ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : await reviewLocal(batch, model);
    const items = validateDecisions(result, batch);
    if (!cached) fs.writeFileSync(cachePath, JSON.stringify(result, null, 2));
    for (const row of batch) results.push({ ...row, decision: items.find(item => item.id === row.id)! });
    fs.writeFileSync(`${output}.tmp`, JSON.stringify({ model, complete: results.length === selected.length,
      scope: allRequested ? 'all' : 'sample', catalogSize: catalog.length, reviewed: results.length,
      updatedAt: new Date().toISOString(), results }, null, 2));
    fs.renameSync(`${output}.tmp`, output);
    console.log(JSON.stringify({ seconds: result.seconds, tokensPerSecond: result.tokensPerSecond, items }));
  }
  console.log(`Saved ${output}. Production catalog unchanged.`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
