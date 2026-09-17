import assert from 'node:assert/strict';
import {test} from 'node:test';
import {moneyFromMajor,formatMoney,localDate,validTimeZone,korea} from '../lib/regional';
test('money uses explicit minor units without treating yen as won or dollars',()=>{
 assert.equal(moneyFromMajor('850',0),850);assert.equal(moneyFromMajor('12.34',2),1234);
 assert.equal(moneyFromMajor('0.10',2),10);assert.throws(()=>moneyFromMajor('12.345',2));
 assert.throws(()=>moneyFromMajor('1.5',0));assert.throws(()=>moneyFromMajor('9007199254740992',0));
 assert.throws(()=>moneyFromMajor('1e6',0));
 assert.match(formatMoney(850,{...korea,currency:'JPY',locale:'ja-JP'}),/850/);
 assert.equal(formatMoney(1234,{currency:'USD',minorUnits:2,locale:'en-US'}),'$12.34');
});
test('local dates respect market/user time zones including different calendar days',()=>{
 const now=new Date('2026-09-17T00:30:00Z');
 assert.equal(localDate('Asia/Tokyo',now),'2026-09-17');assert.equal(localDate('America/Los_Angeles',now),'2026-09-16');
 assert.equal(validTimeZone('Asia/Tokyo'),true);assert.equal(validTimeZone('not/a-zone'),false);
});
