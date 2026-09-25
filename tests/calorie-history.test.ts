import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calorieHistoryRange} from '../lib/calorie-history';
import {calendarCalories} from '../lib/intake-calendar';
test('weekly history crosses years and clips future dates',()=>{assert.deepEqual(calorieHistoryRange('2026-01-01','week'),{from:'2025-12-29',to:'2026-01-04',fetchTo:'2026-01-01',days:7});});
test('monthly history handles leap years and month navigation',()=>{assert.deepEqual(calorieHistoryRange('2024-03-31','month',-1),{from:'2024-02-01',to:'2024-02-29',fetchTo:'2024-02-29',days:29});assert.equal(calorieHistoryRange('2026-01-31','month',-1).from,'2025-12-01');});
test('unknown-only dates stay distinct from true zero and unlogged dates',()=>{const days=calendarCalories([{date:'2026-09-01',calories:null},{date:'2026-09-02',calories:0}]);assert.equal(days['2026-09-01'].missing,1);assert.equal(days['2026-09-02'].missing,0);assert.equal(days['2026-09-03'],undefined);});
