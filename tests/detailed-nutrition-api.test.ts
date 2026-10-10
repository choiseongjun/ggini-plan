import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GET} from '../app/api/food-reference/nutrients/route';
import {getPool} from '../lib/db';

test('detail API validates codes and preserves empty, successful, and unavailable states', async t => {
 const invalid = await GET(new Request('http://localhost/api/food-reference/nutrients?code=manual:test'));
 assert.equal(invalid.status, 400);
 const previous = process.env.DATABASE_URL;
 process.env.DATABASE_URL = 'postgres://test:test@localhost:1/test';
 const pool = getPool();
 let mode: 'data' | 'empty' | 'error' = 'data';
 const query = t.mock.method(pool, 'query', async () => {
  if (mode === 'error') throw new Error('private database connection information');
  return {rows: mode === 'empty' ? [] : [{
   raw_record: {'식품명': '검증 음식', '영양성분함량기준량': '100mL', '당류(g)': '0', '칼슘(mg)': '12.5'},
   headers: ['당류(g)', '칼슘(mg)'], file_name: 'source.xlsx', source_date: '2026-09-29',
  }]};
 });
 try {
  const request = () => new Request('http://localhost/api/food-reference/nutrients?code=P-test');
  const success = await GET(request());
  assert.equal(success.status, 200);
  assert.equal(success.headers.get('Cache-Control'), 'public, max-age=300');
  const {item} = await success.json();
  assert.deepEqual(item.basis, {value: 100, unit: 'mL'});
  assert.equal(item.nutrients[0].value, 0);
  assert.equal(item.nutrients[1].value, 12.5);
  assert.deepEqual(query.mock.calls[0].arguments[1], ['P-test']);
  mode = 'empty';
  assert.deepEqual(await (await GET(request())).json(), {item: null});
  mode = 'error';
  const failure = await GET(request());
  assert.equal(failure.status, 503);
  assert.equal(failure.headers.get('Cache-Control'), null);
  assert.ok(!(await failure.text()).includes('private database'));
 } finally {
  query.mock.restore();
  await pool.end();
  if (previous === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previous;
 }
});
