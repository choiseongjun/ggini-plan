import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nutritionHistoryTotals} from '../lib/nutrition-history';
import {weeklyReport,type StatLog} from '../lib/intake-stats';
const log=(date:string,calories:number|null,protein:number|null):StatLog=>({date,calories,protein,productId:'food',name:'음식',cost:null});
test('incomplete days preserve known subtotal but never lower averages',()=>{
 const logs=[log('2026-10-19',600,20),log('2026-10-19',null,10),log('2026-10-20',1000,null),log('2026-10-21',null,null)];
 const nutrients=nutritionHistoryTotals(logs),kcal=nutrients.find(n=>n.key==='calories')!,protein=nutrients.find(n=>n.key==='protein')!;
 assert.equal(kcal.total,1600);assert.equal(kcal.average,1000);assert.equal(kcal.days,1);assert.equal(kcal.missing,2);
 assert.equal(protein.average,30);assert.equal(protein.days,1);
 const report=weeklyReport(logs,'2026-10-19',{calories:2000,protein:50});assert.equal(report.avgCalories,1000);assert.equal(report.averageDays,1);assert.equal(report.proteinDays,0);assert.equal(report.tip?.kind,'habit');
});
test('all unknown remains null and genuine zero remains zero',()=>{
 assert.equal(weeklyReport([log('2026-10-19',null,null)],'2026-10-19',{calories:null,protein:null}).avgCalories,null);
 assert.equal(weeklyReport([log('2026-10-19',0,0)],'2026-10-19',{calories:2000,protein:50}).avgCalories,0);
});
test('90 percent of a protein target is not achievement and missing entries exclude the day',()=>{
 const logs=[log('2026-10-19',200,45),log('2026-10-20',200,50),log('2026-10-20',null,null),log('2026-10-21',300,50)];
 assert.equal(weeklyReport(logs,'2026-10-19',{calories:2000,protein:50}).proteinDays,1);
});
test('partial meal records never generate deficiency or weight advice',()=>{
 const report=weeklyReport([log('2026-10-19',100,2)],'2026-10-19',{calories:2000,protein:100});
 assert.equal(report.tip?.kind,'habit');assert.match(report.tip!.text,/판단하지/);
});
