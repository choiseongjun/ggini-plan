import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseNaverDishImages,dishImageTitleMatches,dishImageSearchName} from '../lib/naver-dish-images';

test('Naver images are deduplicated by original and unsafe links are excluded',()=>{
 const valid={thumbnail:'https://search.pstatic.net/common/?src=food',link:'https://example.com/food.jpg'};
 assert.equal(parseNaverDishImages({items:[valid,valid]}).length,1);
 assert.deepEqual(parseNaverDishImages({items:[{...valid,link:'javascript:alert(1)'},{...valid,thumbnail:'https://pstatic.net.evil.test/x'},null]}),[]);
 assert.deepEqual(parseNaverDishImages(null),[]);
});
test('photos must match the individual dish, including named ingredients',()=>{
 assert.equal(dishImageTitleMatches('<b>미역줄기 볶음</b> 만들기','미역줄기볶음'),true);
 assert.equal(dishImageTitleMatches('두부조림 레시피','두부구이'),false);
 assert.equal(dishImageTitleMatches('계란 볶음밥','볶음밥_달걀'),true);
 assert.equal(dishImageTitleMatches('김치볶음밥','볶음밥_달걀'),false);
 const image={thumbnail:'https://search.pstatic.net/common/?src=food',link:'https://example.com/food.jpg'};
 assert.equal(parseNaverDishImages({items:[{...image,title:'두부조림'},image,{...image,title:'두부 구이'}]},'두부구이').length,1);
});
test('photo search drops descriptive prefixes but retains dish and ingredient identity',()=>{
 assert.equal(dishImageSearchName('순한맛순두부찌개'),'순두부찌개');
 assert.equal(dishImageSearchName('순한 맛 순두부찌개_해물'),'순두부찌개_해물');
 assert.equal(dishImageTitleMatches('순두부찌개 만들기','순한맛순두부찌개'),true);
 assert.equal(dishImageTitleMatches('된장찌개 만들기','순한맛순두부찌개'),false);
 assert.equal(dishImageTitleMatches('순두부찌개 만들기','순한맛순두부찌개_해물'),false);
 assert.equal(dishImageSearchName('매운탕'),'매운탕');
 assert.equal(dishImageSearchName('김치찌개_돼지고기'),'김치찌개_돼지고기');
});
