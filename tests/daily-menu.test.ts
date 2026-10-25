import assert from 'node:assert/strict';
import {test} from 'node:test';
import {dailyMenus,koreaDate,validEdition,readDailyMenuCollection,dailyMenuCatalogue} from '../lib/daily-menu';

test('editions switch at Korean midnight, not browser or server midnight',()=>{
 assert.equal(koreaDate(new Date('2026-10-11T14:59:59Z')),'2026-10-11');
 assert.equal(koreaDate(new Date('2026-10-11T15:00:00Z')),'2026-10-12');
});
test('each edition has three distinct alternatives and changes the next day',()=>{
 for(let offset=0;offset<65;offset++){
  const date=new Date(Date.UTC(2026,9,12+offset)).toISOString().slice(0,10);
  const next=new Date(Date.UTC(2026,9,13+offset)).toISOString().slice(0,10);
  const menus=dailyMenus(date);
  assert.equal(menus.length,3);assert.equal(new Set(menus.map(m=>m.id)).size,3);
  assert.deepEqual(menus,dailyMenus(date));
  assert.ok(menus.every(m=>!dailyMenus(next).some(n=>n.id===m.id)));
  assert.ok(menus.every(m=>m.ingredients.length&&m.video.url&&m.video.thumbnail));
  assert.equal(new Set(menus.map(m=>m.video.channel)).size,3);
  assert.ok(menus.every(m=>!m.video.channel.includes('백종원')));
 }
});
test('shared historical editions are stable and impossible dates are rejected',()=>{
 assert.deepEqual(dailyMenus('2026-10-12').map(m=>m.name),['간장계란국수','시골된장국','버섯 두부조림']);
 for(const date of ['2026-02-30','2026-13-01','2026-1-01','bad','']){assert.equal(validEdition(date),false);assert.deepEqual(dailyMenus(date),[]);}
});
test('saved menus outlive an edition and malformed storage cannot inject menu content',()=>{
 const id=dailyMenuCatalogue[0].id;
 assert.deepEqual(readDailyMenuCollection(JSON.stringify({saved:[id,id,'unknown',{},null],choice:{date:'2026-10-01',id},html:'bad'})),{saved:[id],choice:{date:'2026-10-01',id}});
 for(const raw of [null,'{','null','[]'])assert.deepEqual(readDailyMenuCollection(raw),{saved:[],choice:null});
 assert.equal(readDailyMenuCollection(JSON.stringify({choice:{date:'2026-02-30',id}})).choice,null);
});
