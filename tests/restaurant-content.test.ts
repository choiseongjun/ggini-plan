import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseRestaurantContent} from '../lib/restaurant-content';
test('filters unsafe result links and renders search markup as plain text',()=>{
 const result=parseRestaurantContent({items:[{title:'<b>가게</b> &amp; 메뉴',thumbnail:'https://search.pstatic.net/photo'},{thumbnail:'javascript:alert(1)'}]},{items:[{title:'<script>alert(1)</script>후기',link:'javascript:alert(1)'},{title:'<b>후기</b>',description:'맛있는 &lt;밥&gt;',link:'https://blog.naver.com/test',bloggername:'작성자'}]});
 assert.equal(result.images.length,1);assert.equal(result.images[0].title,'가게 & 메뉴');assert.equal(result.blogs.length,1);assert.equal(result.blogs[0].description,'맛있는 <밥>');assert.equal(result.partial,false);
});
test('supports partial provider failures and empty results',()=>{
 assert.deepEqual(parseRestaurantContent(null,{items:[]}),{images:[],blogs:[],partial:true});
});
test('excludes other branches and generic directory entries',()=>{
 const result=parseRestaurantContent({items:[{title:'본죽 비빔밥 신도림점',thumbnail:'https://search.pstatic.net/wrong'},{title:'본죽 비빔밥 강남점 점심',thumbnail:'https://search.pstatic.net/right'}]},{items:[{title:'식당 명단',description:'본죽 다른 지점',link:'https://blog.naver.com/wrong'}]},'본죽&비빔밥cafe 강남점');
 assert.equal(result.images.length,1);assert.equal(result.images[0].url,'https://search.pstatic.net/right');assert.equal(result.blogs.length,0);
});
