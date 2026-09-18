import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isKakaoMobileBrowser,kakaoExternalUrl} from '../lib/kakao-browser';
test('only Kakao mobile browser is targeted',()=>{
 for(const ua of ['Android KAKAOTALK','iPhone KAKAOTALK','iPad KAKAOTALK'])assert.equal(isKakaoMobileBrowser(ua),true);
 for(const ua of ['Android Chrome','iPhone Safari','Windows KAKAOTALK'])assert.equal(isKakaoMobileBrowser(ua),false);
});
test('external handoff preserves complete deep links without interpreting query parameters',()=>{
 const url='https://gginiplan.kr/products?name=밥&other=a%26b#nutrition';
 const scheme=kakaoExternalUrl(url)!;
 assert.equal(decodeURIComponent(scheme.split('?url=')[1]),new URL(url).href);
});
test('auth callbacks and nonweb destinations are never automatically handed off',()=>{
 for(const url of ['javascript:alert(1)','https://user:pass@gginiplan.kr/','https://gginiplan.kr/api/auth/google/callback','https://gginiplan.kr/?code=secret','https://gginiplan.kr/#access_token=secret'])assert.equal(kakaoExternalUrl(url),null);
});
