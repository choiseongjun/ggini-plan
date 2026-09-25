import assert from 'node:assert/strict';
import {test} from 'node:test';
import {analyticsScreen,sanitizeAnalytics} from '../lib/analytics-events';
test('analytics strips health, identity, photos, URLs and SDK super-properties',()=>{
 const result=sanitizeAnalytics('photo_analysis_completed',{distinct_id:'0199-abcd',screen:'record',duration_ms:1234.5,photo_count:2,outcome:'recorded',email:'private@example.test',weight:70,food:'private meal',image:'data:image/jpeg;base64,secret',$current_url:'https://gginiplan.kr/?token=secret',$referrer:'private',$set:{email:'private'}});
 assert.deepEqual(result,{$process_person_profile:false,$geoip_disable:true,distinct_id:'0199-abcd',screen:'record',outcome:'recorded',duration_ms:1235,photo_count:2});
});
test('only named events, supported screens and bounded metrics are accepted',()=>{
 for(const event of ['$autocapture','$snapshot','$exception','$identify','unknown'])assert.equal(sanitizeAnalytics(event,{}),null);
 assert.equal(analyticsScreen('/admin'),null);assert.equal(analyticsScreen('/share/private'),null);assert.equal(analyticsScreen('/record'),'record');
 assert.deepEqual(sanitizeAnalytics('photo_analysis_failed',{failure:'raw secret error',duration_ms:Infinity,photo_count:99,screen:'secret',method:'food name'}),{$process_person_profile:false,$geoip_disable:true});
});
