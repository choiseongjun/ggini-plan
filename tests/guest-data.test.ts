import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import { guestDashboard, guestProducts } from '../lib/guest-data';
import { GET as dashboard, PUT } from '../app/api/dashboard/route';
import { GET as compare } from '../app/api/compare/route';

test('guest week follows Seoul date across UTC and year boundaries', () => {
  const data = guestDashboard(new Date('2026-12-31T15:01:00Z'));
  assert.equal(data.today, '2027-01-01');
  assert.equal(data.week, '2026-12-28');
  assert.equal(data.plans.length, 7);
  assert.equal(new Set(data.plans.map(p => p.date)).size, 7);
  assert.ok(data.plans.every(p => p.recommendation.meals.length === 3));
  assert.ok(data.expenses.every(e => e.date <= data.today));
  assert.ok(data.expenses.some(e => e.date < data.week));
});

test('guest browsing works without a database and cannot save sample records', async () => {
  const old = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    const response = await dashboard(new NextRequest('http://localhost:3000/api/dashboard'));
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.isSample, true);
    assert.equal(data.plans.length, 7);
    assert.ok(data.expenses.length > 0);
    assert.equal((await PUT(new NextRequest('http://localhost:3000/api/dashboard', { method: 'PUT' }))).status, 401);
    for (const item of guestProducts) {
      const response = await compare(new Request(`http://localhost:3000/api/compare?item=${item.id}`));
      assert.equal(response.status, 200);
      const comparison = await response.json();
      assert.notEqual(comparison.status, 'live');
      assert.equal(comparison.offers.length, 4);
      assert.ok(comparison.offers.every((offer: {isSearchLink:boolean;url:string}) => offer.isSearchLink && offer.url.startsWith('https://')));
    }
  } finally {
    if (old === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = old;
  }
});
