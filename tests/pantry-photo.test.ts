import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parsePantryPhoto} from '../lib/pantry-photo';
test('normalizes duplicates and keeps uncertain ingredients for review',()=>{
 assert.deepEqual(parsePantryPhoto({source:'ingredients',items:[{name:'계란',category:'달걀·유제품',uncertain:false},{name:'달걀',category:'달걀·유제품',uncertain:false},{name:'쌀',category:'곡류·면',uncertain:true},{name:'밥',category:'곡류·면',uncertain:false}],note:''}).items.map(i=>[i.name,i.uncertain]),[['달걀',false],['쌀',true],['밥',false]]);
});
test('rejects malformed recognition and permits unreadable photos',()=>{
 assert.throws(()=>parsePantryPhoto({source:'ingredients',items:[{name:'양파',category:'invalid',uncertain:false}],note:''}));
 assert.throws(()=>parsePantryPhoto({source:'ingredients',items:[{name:'양파',category:'채소·과일',uncertain:'false'}],note:''}));
 assert.deepEqual(parsePantryPhoto({source:'ingredients',items:[],note:'흐린 사진'}),{source:'ingredients',items:[],note:'흐린 사진'});
});
test('auto classification preserves cart and unknown states and rejects invalid sources',()=>{
 for(const source of ['cart','receipt','ingredients','unknown'])assert.equal(parsePantryPhoto({source,items:[],note:''}).source,source);
 assert.throws(()=>parsePantryPhoto({source:'invalid',items:[],note:''}));
 assert.throws(()=>parsePantryPhoto({items:[],note:''}));
});
