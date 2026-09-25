import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewedRecipeImages } from '../lib/reviewed-recipe-images';
test('saved tofu plans replace apples and reject title cards from their gallery', () => {
 const approved = reviewedRecipeImages('AI-c445b721092a');
 assert.ok(approved?.length);
 assert.equal(approved[0], 'https://search1.kakaocdn.net/argon/130x130_85_c/3lNXD28qmP');
 assert.deepEqual(reviewedRecipeImages(undefined, 'https://search4.kakaocdn.net/argon/130x130_85_c/LaKAmM5g7H1'), approved);
 assert.ok(!approved.includes('https://search1.kakaocdn.net/argon/130x130_85_c/1iyb7Ob0iW8'));
 assert.equal(reviewedRecipeImages(undefined, 'https://example.com/unrelated.jpg'), undefined);
});
