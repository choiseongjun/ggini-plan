import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import { emptyDashboard } from '../lib/dashboard';
import { GET } from '../app/api/dashboard/route';

test('empty dashboard follows Seoul date across year boundaries without invented records', () => {
 assert.deepEqual(emptyDashboard(new Date('2026-12-31T15:01:00Z')), {today:'2027-01-01',week:'2026-12-28',budget:null,plans:[],expenses:[]});
});
test('anonymous dashboard returns no sample data without a database', async () => {
 const old = process.env.DATABASE_URL;
 delete process.env.DATABASE_URL;
 try {
  const response = await GET(new NextRequest('http://localhost:3000/api/dashboard'));
  assert.equal(response.status,200);
  const data = await response.json();
  assert.equal(data.budget,null);
  assert.deepEqual(data.plans,[]);
  assert.deepEqual(data.expenses,[]);
  assert.equal(data.isSample,undefined);
 } finally {
  if(old === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = old;
 }
});
