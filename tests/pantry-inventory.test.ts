import test from 'node:test';
import assert from 'node:assert/strict';
import {restorePantry,pantryForRecommendation,validPantryDate,parsePantryEntry,mergePantryEntries} from '../lib/pantry-inventory';
test('legacy ingredients migrate with optional fields and invalid dates are rejected',()=>{
 const items=restorePantry([{name:'계란'},{name:'두부',expiresOn:'2026-02-30',opened:true}]);
 assert.equal(items[0].name,'달걀');assert.equal(items[0].quantity,'');assert.equal(items[1].expiresOn,'');assert.equal(items[1].opened,true);
 assert.equal(validPantryDate('2026-10-02'),'2026-10-02');
});
test('free text accepts real pantry quantities without a predefined ingredient list',()=>{
 assert.deepEqual(parsePantryEntry('계란 2개, 남은 두부 반 모, 냉동 닭가슴살 300g\n팽이버섯'),[{name:'달걀',quantity:'2개'},{name:'두부',quantity:'반 모'},{name:'닭가슴살',quantity:'300g'},{name:'팽이버섯',quantity:''}]);
 assert.deepEqual(parsePantryEntry(' , \n'),[]);
});
test('planned and expired lots are excluded; an unexpired duplicate still counts',()=>{
 const items=restorePantry([{name:'두부',expiresOn:'2026-10-01'},{name:'두부',expiresOn:'2026-10-04'},{name:'계란',expiresOn:'2026-10-02'},{name:'양파'},{name:'김치',planned:true}]);
 assert.deepEqual(pantryForRecommendation(items,'2026-10-02'),{owned:['두부','달걀','양파'],priority:['달걀','두부']});
});
test('manual use-soon flags persist and take priority without including planned or expired items',()=>{
 const items=restorePantry([{name:'두부',expiresOn:'2026-10-03'},{name:'양파',useSoon:true},{name:'김치',useSoon:true,planned:true},{name:'달걀',useSoon:true,expiresOn:'2026-10-01'}]);
 assert.equal(items[1].useSoon,true);
 assert.deepEqual(pantryForRecommendation(items,'2026-10-02'),{owned:['두부','양파'],priority:['양파','두부']});
});
test('repeated aliases merge while planned purchases and expired lots remain separate',()=>{
 const current=restorePantry([{name:'계란',quantity:'1개',useSoon:true},{name:'두부',planned:true},{name:'김치',expiresOn:'2026-10-01'}]);
 const next=mergePantryEntries(current,parsePantryEntry('계란 2개, 달걀, 두부, 김치'),false,'2026-10-02');
 assert.equal(next.length,5);
 assert.equal(next[0].quantity,'2개');
 assert.equal(next[0].useSoon,true);
 assert.equal(current[0].quantity,'1개');
 assert.equal(next.filter(item=>item.name==='두부').length,2);
 assert.deepEqual(pantryForRecommendation(next,'2026-10-02').owned,['달걀','두부','김치']);
});
