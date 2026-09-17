import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {recommendationFeedbackMessage} from '../lib/recommendation-feedback';
import {parseFeedback,recommendationFeedbackKinds} from '../lib/service-feedback';
import {initialConditions} from '../lib/shopping-plan';
test('recommendation feedback accepts every reaction and retains bounded shopping context only',()=>{
 const message=recommendationFeedbackMessage({...initialConditions,avoid:'private preference'},Array.from({length:45},(_,i)=>('긴상품명'.repeat(30))+i),'의견'.repeat(300));
 assert.ok(message.length<=1000);assert.ok(!message.includes('private preference'));assert.ok(message.includes('50,000원'));
 for(const kind of Object.keys(recommendationFeedbackKinds))assert.ok(parseFeedback({id:randomUUID(),kind,message,page:'/cart'}));
 assert.equal(parseFeedback({id:randomUUID(),kind:'recommend_bad_key',message,page:'/'}),null);
});
test('repeated meals are summarized once and optional note is retained',()=>{
 const message=recommendationFeedbackMessage(initialConditions,['볶음밥','볶음밥','샐러드'],'덜 매운 메뉴');
 assert.equal(message.match(/볶음밥/g)?.length,1);assert.ok(message.includes('덜 매운 메뉴'));
});
