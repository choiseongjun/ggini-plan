import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseBodyProfile,profileYear} from '../lib/body-profile';
const base={height:165,weight:60,sex:'female',activity:'light',meals:3,pregnancy:false};
test('birth year is retained and determines calculation age rather than a stale submitted age',()=>{
 const birthYear=profileYear()-28;
 assert.equal(parseBodyProfile({...base,birthYear,age:40})?.age,28);
 assert.equal(parseBodyProfile({...base,birth_year:birthYear,age:40})?.birthYear,birthYear);
 assert.equal(parseBodyProfile({...base,age:28})?.birthYear,undefined);
 assert.equal(parseBodyProfile({...base,age:28})?.age,28);
});
test('birth year rejects incomplete, future and unsupported ages',()=>{
 for(const birthYear of [0,98,'1998',profileYear()+1,profileYear()-18,profileYear()-79,1998.5])assert.equal(parseBodyProfile({...base,birthYear,age:28}),null);
 assert.equal(parseBodyProfile({...base,birthYear:profileYear()-19})?.age,19);
 assert.equal(parseBodyProfile({...base,birthYear:profileYear()-78})?.age,78);
});
