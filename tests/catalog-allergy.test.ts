import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateAllergens, validateAllergyInfo, emptyAllergyInfo } from '../lib/catalog-allergy';

test('allergen input validates identifiers and removes duplicates', () => {
  assert.deepEqual(validateAllergens(['egg','soy','egg','sulfites']), ['egg','soy','sulfites']);
  for (const value of [null, 'egg', ['unknown-allergen'], [1]]) assert.throws(() => validateAllergens(value));
});
test('unknown is distinct from a checked contains statement', () => {
  assert.deepEqual(validateAllergyInfo(emptyAllergyInfo), emptyAllergyInfo);
  assert.throws(() => validateAllergyInfo({...emptyAllergyInfo,status:'verified'}));
  assert.throws(() => validateAllergyInfo({...emptyAllergyInfo,status:'verified',sourceUrl:'https://example.com'}));
  assert.throws(() => validateAllergyInfo({...emptyAllergyInfo,sourceUrl:'javascript:alert(1)'}));
  assert.throws(() => validateAllergyInfo({...emptyAllergyInfo,evidenceUrls:['http://example.com']}));
});
test('reviewed catalog records validate and retain source evidence', () => {
  const items = JSON.parse(readFileSync('data/catalog-allergies-2026-09-17.json','utf8'));
  assert.equal(new Set(items.map((item: {id:string}) => item.id)).size, items.length);
  for (const item of items) {
    assert.deepEqual(validateAllergens(item.allergens),item.allergens);
    assert.deepEqual(validateAllergyInfo(item.allergyInfo),item.allergyInfo);
  }
  const get = (id:string) => items.find((item:{id:string})=>item.id===id);
  assert(get('meal-kit-kimchi-stew').allergens.includes('pork'));
  assert(get('meal-kit-kimchi-stew').allergens.includes('crab'));
  // Cross-contact chicken and shrimp in this label must NOT become contains.
  assert(!get('kurly-1002042275').allergens.includes('chicken'));
  assert(!get('kurly-1002042275').allergens.includes('shrimp'));
  assert.equal(get('kurly-1001765937').allergyInfo.status,'unknown');
});
