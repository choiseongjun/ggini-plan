import {test} from 'node:test';
import assert from 'node:assert/strict';
import {commonMeals} from '../lib/together-meal';
test('both people must like a meal, and either person can exclude an ingredient',()=>{
 assert.deepEqual(commonMeals('home',[['h1','h2'],['h2','h3']],[[],[]]).map(m=>m.id),['h2']);
 assert.deepEqual(commonMeals('home',[['h2'],['h2']],[[],['밀']]),[]);
 assert.deepEqual(commonMeals('home',[['h1'],[]],[[],[]]),[]);
 assert.deepEqual(commonMeals('out',[['h1'],['h1']],[[],[]]),[]);
});
