import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nutritionHistoryTotals} from '../lib/nutrition-history';
test('period totals average by known days, not meal count or unrecorded dates',()=>{
 const result=nutritionHistoryTotals([{date:'2026-09-01',calories:400,sugar:0,sodium:200},{date:'2026-09-01',calories:600,sugar:4,sodium:300},{date:'2026-09-03',calories:800,sugar:null}]);
 assert.deepEqual(result.find(x=>x.key==='calories'),{key:'calories',label:'칼로리',unit:'kcal',total:1800,average:900,days:2,missing:0});
 assert.deepEqual(result.find(x=>x.key==='sugar'),{key:'sugar',label:'당류',unit:'g',total:4,average:4,days:1,missing:1});
 assert.equal(result.find(x=>x.key==='sodium')!.total,500);
 assert.equal(result.find(x=>x.key==='fat')!.total,null);
});
test('empty and invalid data stay unknown while a known zero remains zero',()=>{
 assert.ok(nutritionHistoryTotals([]).every(n=>n.total===null&&n.average===null));
 const result=nutritionHistoryTotals([{date:'2026-09-01',sugar:0,fat:NaN},{date:'2026-09-02',sugar:null,fat:Infinity}]);
 assert.equal(result.find(x=>x.key==='sugar')!.average,0);
 assert.equal(result.find(x=>x.key==='fat')!.total,null);
});
