import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMenuPhotoChoice} from '../lib/admin-menu-photo';
import {reviewedRecipeImages} from '../lib/reviewed-recipe-images';
test('AI can select only a supplied candidate or reject all',()=>{
 assert.equal(parseMenuPhotoChoice('{"index":1,"reason":"두부구이"}',['a','b']).image,'b');
 assert.equal(parseMenuPhotoChoice('{"index":-1,"reason":"불일치"}',['a']).image,null);
 for(const index of [2,-2,0.5,'0']) assert.throws(()=>parseMenuPhotoChoice(JSON.stringify({index,reason:'test'}),['a','b']));
});
test('explicit AI replacement is not overwritten by legacy manual correction',()=>{
 assert.equal(reviewedRecipeImages('AI-c445b721092a','https://search1.kakaocdn.net/new-tofu.jpg'),undefined);
 assert.ok(reviewedRecipeImages('AI-c445b721092a','https://search4.kakaocdn.net/argon/130x130_85_c/LaKAmM5g7H1')?.length);
});
