import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recipeVideoNotes} from '../lib/recipe-video-notes';
test('extracts published ingredients and cooking steps without inventing missing quantities',()=>{
 const notes=recipeVideoNotes('[재료]\n두부 1모\n물 약간\n[만드는 법]\n1. 두부를 썰어 주세요.\n2. 팬에 넣고 구워 주세요.\n[팁]\n간은 취향에 맞춰 주세요.\n구독 좋아요 부탁드려요.');
 assert.deepEqual(notes,{ingredients:['두부 1모','물 약간'],steps:['두부를 썰어 주세요.','팬에 넣고 구워 주세요.'],tips:['간은 취향에 맞춰 주세요.']});
});
test('promotional descriptions and absent text do not become a recipe',()=>{
 for(const text of ['', '정말 맛있는 두부요리! 구독 좋아요 부탁드려요.\nhttps://example.com', '[재료]\n두부 1모\n[이벤트]\n응모 1회']){
  const notes=recipeVideoNotes(text);assert.deepEqual(notes.steps,[]);assert.ok(!notes.ingredients.includes('응모 1회'));
 }
});
test('supports inline ingredient headings, numbered steps, and bounded source text',()=>{
 assert.deepEqual(recipeVideoNotes('*재료(2~3인분)\n후추\n참기름,참깨 (마무리)').ingredients,['재료(2~3인분)','후추','참기름,참깨 (마무리)']);
 const notes=recipeVideoNotes('재료: 감자 2개, 소금 약간\n1. 감자를 씻어 썰어요.\n2. 냄비에 넣고 끓여요.\nhttps://example.com\n할인코드 1234');
 assert.deepEqual(notes.ingredients,['감자 2개, 소금 약간']);assert.equal(notes.steps.length,2);
 assert.equal(recipeVideoNotes('[재료]\n'+Array.from({length:30},(_,i)=>`재료${i} 1g`).join('\n')).ingredients.length,24);
});
