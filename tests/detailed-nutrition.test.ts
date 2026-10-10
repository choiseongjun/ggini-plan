import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {detailedFoodCode, nutritionAmount, nutritionScale, nutrientText, parseDetailedNutrients} from '../lib/detailed-nutrition';

test('preserves true zeros, unknowns, nested names, RAE units and nonnumeric source annotations', () => {
 const raw = {'당류(g)': '0', '칼슘(mg)': '', '철(mg)': null, '비타민A(μg RAE)': '0.00000001', 'DHA / 도코사헥사엔산(22:6(n-3))(mg)': '1,234.5', '비타민 C(mg)': '미량', '식품명': '음식'};
 const values = parseDetailedNutrients(raw, Object.keys(raw));
 assert.equal(values.length, 4);
 assert.equal(values[0].value, 0);
 assert.equal(values[1].unit, 'μg RAE');
 assert.notEqual(nutrientText(values[1], .25), '0');
 assert.equal(values[2].value, 1234.5);
 assert.equal(values[2].group, '지방산·콜레스테롤');
 assert.equal(values[3].value, null);
 assert.equal(nutrientText(values[3], 2), '미량');
});

test('quantity conversion never substitutes mass for volume or a package for one serving', () => {
 const basis = nutritionAmount('100g');
 assert.equal(nutritionScale(basis, nutritionAmount('0.25kg')), 2.5);
 assert.equal(nutritionScale(basis, nutritionAmount('250mL')), null);
 assert.equal(nutritionAmount('1개(100g)'), null);
 assert.equal(nutritionAmount('0g'), null);
 assert.equal(nutritionAmount('-100g'), null);
 assert.equal(nutritionScale(basis, {value: NaN, unit: 'g'}), null);
 assert.equal(nutritionScale(nutritionAmount('100mL'), nutritionAmount('1L')), 10);
});

test('all nutrient columns from the imported food and processed datasets are supported', () => {
 const manifest = JSON.parse(readFileSync('tests/fixtures/kfind-headers.json', 'utf8')) as {file: string; headers: string[]}[];
 for (const file of manifest.filter(f => !f.file.includes('건강기능'))) {
  const start = file.headers.indexOf('에너지(kcal)');
  const end = file.headers.indexOf('출처코드') - 1;
  assert.ok(start > 0 && end > start);
  const headers = file.headers.slice(start, end + 1);
  const parsed = parseDetailedNutrients(Object.fromEntries(headers.map(h => [h, '0'])), file.headers);
  assert.equal(parsed.length, headers.length, file.file);
  assert.deepEqual(parsed.map(n => n.key), headers);
 }
});

test('detail lookup accepts official foods, excludes supplements and invented identities', () => {
 assert.equal(detailedFoodCode('ref:D410-529000000-0001'), 'D410-529000000-0001');
 assert.equal(detailedFoodCode('P-test'), 'P-test');
 for (const code of ['manual:김치', 'raw:R1', 'photo:1', 'F123', 'recipe-opt-ingredient-rice', "D';DROP TABLE x", 'D' + 'a'.repeat(80)]) assert.equal(detailedFoodCode(code), null);
});
