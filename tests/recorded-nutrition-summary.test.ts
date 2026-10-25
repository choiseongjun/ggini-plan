import test from 'node:test';
import assert from 'node:assert/strict';
import {recordedNutrientSummary} from '../lib/recorded-nutrition-summary';
test('partial totals report missing fields without pretending they are zero',()=>{
 assert.deepEqual(recordedNutrientSummary([{calories:100},{calories:null},{}],'calories'),{total:100,missing:2});
 assert.deepEqual(recordedNutrientSummary([{calories:null}],'calories'),{total:null,missing:1});
 assert.deepEqual(recordedNutrientSummary([{calories:0}],'calories'),{total:0,missing:0});
 assert.deepEqual(recordedNutrientSummary([{calories:NaN}],'calories'),{total:null,missing:1});
});
