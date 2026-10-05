import assert from 'node:assert/strict';
import {test} from 'node:test';
import {kstClock,mealsFromNow} from '../lib/meal-now';

const at=(hh:number,mm=0)=>({date:'2026-10-05',minutes:hh*60+mm});
test('recommends only the meals still ahead today',()=>{
 assert.deepEqual(mealsFromNow(at(8)).slots,['breakfast','lunch','dinner']);
 assert.equal(mealsFromNow(at(8)).label,'오늘 식단');
 assert.deepEqual(mealsFromNow(at(12)).slots,['lunch','dinner']);
 assert.equal(mealsFromNow(at(12)).label,'오늘 점심·저녁');
 assert.deepEqual(mealsFromNow(at(19)).slots,['dinner']);
 assert.equal(mealsFromNow(at(19)).label,'오늘 저녁');
});
test('late at night or after logging everything it plans tomorrow',()=>{
 const late=mealsFromNow(at(21));
 assert.equal(late.tomorrow,true);assert.equal(late.date,'2026-10-06');assert.equal(late.label,'내일 식단');
 assert.equal(mealsFromNow(at(19),['dinner']).tomorrow,true);
 assert.deepEqual(mealsFromNow(at(12),['lunch']).slots,['dinner']);
});
test('KST clock',()=>{
 assert.deepEqual(kstClock(new Date('2026-10-05T10:30:00Z')),{date:'2026-10-05',minutes:19*60+30});
 assert.equal(kstClock(new Date('2026-10-05T16:00:00Z')).date,'2026-10-06');
});
