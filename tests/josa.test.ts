import assert from 'node:assert/strict';
import {test} from 'node:test';
import {josa} from '../lib/josa';
test('josa follows the final consonant',()=>{
 assert.equal(josa('된장국','이','가'),'된장국이');
 assert.equal(josa('김치찌개','이','가'),'김치찌개가');
 assert.equal(josa('김치찌개','과','와'),'김치찌개와');
 assert.equal(josa('ABC','이','가'),'ABC가');
 assert.equal(josa('밥·달걀','으로','로'),'밥·달걀로');
 assert.equal(josa('김치·밥','으로','로'),'김치·밥으로');
 assert.equal(josa('두부','으로','로'),'두부로');
});
