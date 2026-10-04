import assert from 'node:assert/strict';
import {test} from 'node:test';
import {josa} from '../lib/josa';
test('josa follows the final consonant',()=>{
 assert.equal(josa('된장국','이','가'),'된장국이');
 assert.equal(josa('김치찌개','이','가'),'김치찌개가');
 assert.equal(josa('김치찌개','과','와'),'김치찌개와');
 assert.equal(josa('ABC','이','가'),'ABC가');
});
