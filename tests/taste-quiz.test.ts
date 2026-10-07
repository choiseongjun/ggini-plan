import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quizAnswers,quizMask,quizScore,quizMenuIndices,commonQuizMenus,tasteQuestions,parseQuiz} from '../lib/taste-quiz';
import {sanitizeAnalytics,analyticsScreen} from '../lib/analytics-events';

test('all quiz links round-trip; every scenario has two different valid foods',()=>{
 for(const q of tasteQuestions){assert.notEqual(q.foods[0],q.foods[1]);for(const i of q.foods)assert.ok(i>=0&&i<6);}
 for(let mask=0;mask<64;mask++){assert.equal(parseQuiz(String(mask)),mask);assert.equal(quizMask(quizAnswers(mask)),mask);}
 for(const value of ['64','-1','00','',undefined,['3']])assert.equal(parseQuiz(value),null);
});
test('guess accuracy is separate from preference overlap for all 4096 pairings',()=>{
 for(let a=0;a<64;a++)for(let b=0;b<64;b++){
  const expected=quizAnswers(a).filter((side,i)=>side===quizAnswers(b)[i]).length;
  assert.equal(quizScore(a,b),expected);
  const common=commonQuizMenus(a,b);
  assert.equal(new Set(common).size,common.length);
  assert.deepEqual(common,quizMenuIndices(a).filter(i=>quizMenuIndices(b).includes(i)));
 }
 assert.equal(quizScore(0,0),6);assert.equal(quizScore(0,63),0);
 assert.deepEqual(commonQuizMenus(56,7),[]);
});
test('quiz funnel accepts events but strips answers, invite URLs, and identities',()=>{
 assert.equal(analyticsScreen('/taste'),'taste');
 assert.deepEqual(sanitizeAnalytics('taste_guess_completed',{screen:'taste',q:45,guess:63,me:2,url:'https://example.test/?q=45',name:'private'}),{$process_person_profile:false,$geoip_disable:true,screen:'taste'});
});
