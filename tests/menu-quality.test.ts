import assert from 'node:assert/strict';
import test from 'node:test';
import {menuQuality,reviewMatches,qualityAllowsRecommendation} from '../lib/menu-quality';
test('new and changed recipes cannot silently bypass menu review',()=>{
 const row={originalName:'두부구이',ingredients:[{name:'두부',grams:200}]};
 assert.equal(reviewMatches(row,'두부구이',[{name:'두부',grams:200}]),true);
 assert.equal(reviewMatches(row,'사과구이',[{name:'두부',grams:200}]),false);
 assert.equal(reviewMatches(row,'두부구이',[{name:'사과',grams:200}]),false);
 assert.equal(reviewMatches(row,'두부구이',[{name:'두부',grams:20}]),false);
 assert.equal(qualityAllowsRecommendation(menuQuality('new-not-reviewed','새 메뉴',[])),false);
 for(const action of ['hold','pending'] as const) assert.equal(qualityAllowsRecommendation({action,name:'a',originalName:'a',reason:'검토'}),false);
 for(const action of ['keep','rename'] as const) assert.equal(qualityAllowsRecommendation({action,name:'a',originalName:'a',reason:''}),true);
});
