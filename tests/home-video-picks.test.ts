import {test} from 'node:test';
import assert from 'node:assert/strict';
import {homeVideoPicks} from '../lib/home-video-picks';
import {parseTasteSave} from '../lib/pending-taste-save';
import {sanitizeAnalytics} from '../lib/analytics-events';

test('every editorial video has the matching recipe and a unique playable YouTube id',()=>{
 const picks=homeVideoPicks();
 assert.equal(picks.length,6);
 assert.equal(new Set(picks.map(p=>p.video.id)).size,6);
 assert.equal(new Set(picks.map(p=>p.channelId)).size,6);
 assert.ok(picks.every(p=>!p.video.channel.includes('백종원')));
 assert.ok(picks.every(p=>p.publishedAt>='2026-01-01'));
 for(const {product,video} of picks){
  assert.match(video.id,/^[\w-]{11}$/);
  assert.equal(product.sourceRecipe?.video.id,video.id);
  assert.ok(product.sourceRecipe!.ingredients.length>0);
  assert.ok(product.sourceRecipe!.steps.length>0||product.sourceRecipe!.videoInstructionsOnly===true);
  assert.equal(video.url,`https://www.youtube.com/watch?v=${video.id}`);
 }
});
test('home video login continuation returns home but cannot redirect off-site',()=>{
 const draft={id:'d7494f68-e1a3-4d01-9e85-91e14dfe8d02',name:'두부조림',day:'2026-10-08',slot:'dinner',at:Date.now()};
 assert.equal(parseTasteSave(JSON.stringify({...draft,returnTo:'/'}))?.returnTo,'/');
 for(const returnTo of ['//example.com','/profile','https://example.com'])assert.equal(parseTasteSave(JSON.stringify({...draft,returnTo}))?.returnTo,undefined);
 assert.ok(sanitizeAnalytics('home_video_saved',{screen:'home'}));
});
