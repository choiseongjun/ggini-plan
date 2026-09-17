import test from 'node:test';
import assert from 'node:assert/strict';
import translations from '../data/planner-zh-TW.json';
import {translatePlanner} from '../app/planner-locale';
test('Traditional Chinese text handles punctuation literally and preserves product prices',()=>{
 for(const [source,translated] of Object.entries(translations))assert.equal(translatePlanner(source),translated,source);
 assert.equal(translatePlanner('NT$103.50 · 270g · 桂冠炒飯'),'NT$103.50 · 270g · 桂冠炒飯');
 assert.equal(translatePlanner('며칠을 준비할까요?'),'想準備幾天？');
});
