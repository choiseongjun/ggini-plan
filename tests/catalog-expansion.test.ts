import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateAllergyInfo, validateAllergens } from '../lib/catalog-allergy';

const manifest = JSON.parse(readFileSync('data/catalog-expansion-2026-09-17.json','utf8'));
type Row = {id:string;name:string;price:number;quantity:number;unit:string;category:string;productUrl:string;productImageUrl:string;checkedAt:string;sourceKeyword:string;cuisine:string;allergens:string[];allergyInfo:Parameters<typeof validateAllergyInfo>[0]};
const rows:Row[] = manifest.rows;
test('expansion reaches 500 with unique, source-linked products', () => {
  assert.equal(manifest.existingCount+rows.length,500);
  for(const field of ['id','productUrl','name'] as const) assert.equal(new Set(rows.map(p=>p[field].trim())).size,rows.length);
  for(const p of rows) {
    assert.equal(p.productUrl,`https://www.kurly.com/goods/${p.id.slice(6)}`);
    assert(p.productImageUrl.startsWith('https://'));
    assert(Number.isSafeInteger(p.price)&&p.price>0);
    assert.equal(p.quantity,1);assert.equal(p.unit,'개');
    assert(Number.isFinite(Date.parse(p.checkedAt)));
  }
});
test('cuisine coverage includes pasta, western and Asian meal choices', () => {
  assert(rows.filter(p=>p.sourceKeyword==='파스타').length>=30);
  assert(rows.filter(p=>p.cuisine==='western').length>=100);
  assert(new Set(rows.map(p=>p.sourceKeyword)).size>=20);
  for(const p of rows) assert(!/주식캔|스프레이|도시락통|도시락\s*김|스프볼|프링글스|꼬북칩|도리토스|오리온|팝콘|비스킷|KIDS/.test(p.name));
});
test('unreviewed labels are never represented as verified or allergy free', () => {
  for(const p of rows) {
    assert.deepEqual(validateAllergens(p.allergens),[]);
    const info=validateAllergyInfo(p.allergyInfo);
    assert.equal(info.status,'unknown');assert.equal(info.sourceUrl,p.productUrl);
    assert(info.note.includes('미등록은 알레르기 없음이 아닙니다'));
  }
});
test('standalone pasta noodles and raw steak are ingredients, not complete meals', () => {
  for(const p of rows.filter(p=>/\[바릴라\]|\[그라노로\]|\[일상味소\]|피자도우|볶음밥용 채소/.test(p.name))) assert.equal(p.category,'ingredient',p.name);
});
