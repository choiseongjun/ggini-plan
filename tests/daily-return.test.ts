import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyReturnMessage} from '../lib/daily-return';

test('first record is an invitation, not a claimed accomplishment',()=>{
  const result=dailyReturnMessage(false,0);
  assert.equal(result.href,'/record');
  assert.equal(result.days,0);
  assert.match(result.title,/시작/);
});
test('today logged leads to the real weekly report',()=>{
  const result=dailyReturnMessage(true,3);
  assert.equal(result.href,'/profile#weekly-report');
  assert.match(result.description,/3일/);
});
test('returning without a record today offers recording without streak pressure',()=>{
  const result=dailyReturnMessage(false,2);
  assert.equal(result.href,'/record');
  assert.match(result.description,/쉬었던 날이 있어도 괜찮/);
});
test('new week resets progress instead of carrying last week forward',()=>{
  assert.equal(dailyReturnMessage(false,0).days,0);
  assert.equal(dailyReturnMessage(true,1).days,1);
});
