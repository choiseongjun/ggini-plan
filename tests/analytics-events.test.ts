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

test('kcal pages are a tracked screen and entry source is allowlisted',()=>{
 assert.equal(analyticsScreen('/kcal/김치찌개'),'kcal');
 assert.equal(analyticsScreen('/kcal'),'kcal');
 assert.deepEqual(sanitizeAnalytics('landing_cta_clicked',{screen:'kcal',source:'kcal'}),{$process_person_profile:false,$geoip_disable:true,screen:'kcal',source:'kcal'});
 assert.equal(sanitizeAnalytics('landing_cta_clicked',{source:'https://evil.example'})?.source,undefined);
});

test('refine chips are an allowlisted event property',()=>{
 assert.equal(sanitizeAnalytics('recommendation_refined',{screen:'home',refine:'spicy'})?.refine,'spicy');
 assert.equal(sanitizeAnalytics('recommendation_refined',{refine:'anything'})?.refine,undefined);
});

test('planner sections are tracked by name without ids',()=>{
 for(const [path,screen] of [['/eat-out','eat_out'],['/convenience','convenience'],['/ingredients','ingredients'],['/calendar/week','calendar'],['/compare/rice-1','compare'],['/deals','deals']])assert.equal(analyticsScreen(path),screen);
 assert.equal(analyticsScreen('/together'),null);assert.equal(analyticsScreen('/battle/abc'),null);
 assert.equal(sanitizeAnalytics('page_viewed',{screen:'eat_out'})?.screen,'eat_out');
});

test('post-recommendation actions carry only an allowlisted channel',()=>{
 assert.deepEqual(sanitizeAnalytics('restaurant_opened',{screen:'eat_out',channel:'map',name:'private restaurant'}),{$process_person_profile:false,$geoip_disable:true,screen:'eat_out',channel:'map'});
 assert.equal(sanitizeAnalytics('plan_shared',{channel:'https://share.example'})?.channel,undefined);
 assert.equal(sanitizeAnalytics('push_opened',{source:'push'})?.source,'push');
});
