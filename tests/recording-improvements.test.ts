import test from 'node:test';
import assert from 'node:assert/strict';
import {photoAnalysisPolicy} from '../lib/photo-analysis-policy';
import {weeklyCheckIn} from '../lib/weekly-check-in';
import {rescaleIntake} from '../lib/intake-edit';
import {NextRequest} from 'next/server';
import {GET,POST} from '../app/api/food-intake/reuse/route';
test('budget bounds requests without assuming a provider token price',()=>{
 assert.equal(photoAnalysisPolicy({}).monthly,1200);
 assert.equal(photoAnalysisPolicy({PHOTO_ANALYSIS_MONTHLY_BUDGET_KRW:'100',PHOTO_ANALYSIS_RESERVED_COST_KRW:'3'}).monthly,33);
 assert.equal(photoAnalysisPolicy({PHOTO_ANALYSIS_MONTHLY_BUDGET_KRW:'1',PHOTO_ANALYSIS_RESERVED_COST_KRW:'3'}).monthly,0);
 assert.equal(photoAnalysisPolicy({PHOTO_ANALYSIS_DAILY_LIMIT:'Infinity'}).daily,40);
});
test('weekly check-in never turns unknown nutrients into completeness',()=>{
 assert.equal(weeklyCheckIn([{}]).missing,1);
 assert.equal(weeklyCheckIn([{calories:0,protein:0,carbs:0,fat:0}]).confirmed,1);
 assert.equal(weeklyCheckIn([]).confirmed,0);
 assert.equal(weeklyCheckIn([{calories:NaN}]).missing,1);
});
test('reuse scales confirmed nutrients and preserves unknown values',()=>{
 assert.equal(rescaleIntake(200,2,.5),50);assert.equal(rescaleIntake(null,2,.5),null);
 assert.throws(()=>rescaleIntake(200,0,1));
});
test('reuse endpoints reject guests and cross-origin writes',async()=>{
 assert.equal((await GET(new NextRequest('https://gginiplan.kr/api/food-intake/reuse'))).status,401);
 assert.equal((await POST(new NextRequest('https://gginiplan.kr/api/food-intake/reuse',{method:'POST',headers:{origin:'https://evil.test'}}))).status,403);
});
