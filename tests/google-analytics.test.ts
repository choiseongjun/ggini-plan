import assert from 'node:assert/strict';
import {test} from 'node:test';
import {googleEvent,trackGoogleAnalytics} from '../lib/google-analytics';
test('GA only receives allowlisted fields and generic page locations',()=>{
 const result=googleEvent('page_viewed',{screen:'record',email:'private',food:'secret',distinct_id:'abc',$current_url:'https://example.com/?token=secret'} as never)!;
 assert.equal(result.name,'page_view');assert.equal(result.params.page_location,'https://gginiplan.kr/record');
 for(const key of ['email','food','distinct_id','$current_url','$geoip_disable'])assert.equal(result.params[key],undefined);
 assert.equal(googleEvent('page_viewed',{screen:'admin'}),null);
 assert.equal(googleEvent('unknown' as never,{screen:'home'}),null);
});
test('GA keeps funnel event names and is harmless on the server',()=>{
 assert.equal(googleEvent('save_login_succeeded',{screen:'home'})?.name,'save_login_succeeded');
 assert.doesNotThrow(()=>trackGoogleAnalytics('page_viewed',{screen:'home'}));
});
