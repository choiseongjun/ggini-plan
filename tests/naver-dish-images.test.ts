import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseNaverDishImages} from '../lib/naver-dish-images';

test('Naver images are deduplicated by original and unsafe links are excluded',()=>{
 const valid={thumbnail:'https://search.pstatic.net/common/?src=food',link:'https://example.com/food.jpg'};
 assert.equal(parseNaverDishImages({items:[valid,valid]}).length,1);
 assert.deepEqual(parseNaverDishImages({items:[{...valid,link:'javascript:alert(1)'},{...valid,thumbnail:'https://pstatic.net.evil.test/x'},null]}),[]);
 assert.deepEqual(parseNaverDishImages(null),[]);
});
