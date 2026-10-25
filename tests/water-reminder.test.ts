import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_WATER_TIMES,dueWaterTimes,parseWaterReminder,waterReminderBody} from '../lib/water-reminder';
test('water times reject overnight, duplicates, close intervals and malformed input',()=>{
  assert.deepEqual(parseWaterReminder({enabled:true,times:DEFAULT_WATER_TIMES}),{enabled:true,times:DEFAULT_WATER_TIMES});
  for(const times of [['23:00'],['05:59'],['10:00','10:00'],['10:00','10:30'],['bad'],[],Array(7).fill('12:00')])assert.equal(parseWaterReminder({enabled:true,times}),null);
  assert.equal(parseWaterReminder({enabled:'yes',times:DEFAULT_WATER_TIMES}),null);
});
test('delivery uses KST and a bounded catch-up window',()=>{
  assert.deepEqual(dueWaterTimes(DEFAULT_WATER_TIMES,new Date('2026-10-23T01:15:00Z')),{day:'2026-10-23',times:['10:00']});
  assert.deepEqual(dueWaterTimes(DEFAULT_WATER_TIMES,new Date('2026-10-23T01:30:00Z')).times,[]);
  assert.deepEqual(dueWaterTimes(DEFAULT_WATER_TIMES,new Date('2026-10-23T00:59:00Z')).times,[]);
});
test('copy reports recorded amounts without inventing a default goal',()=>{
  assert.match(waterReminderBody(1250,null),/1.25 L/);
  assert.ok(!waterReminderBody(0,null).includes('목표'));
  assert.match(waterReminderBody(1000,2000),/2 L/);
});
