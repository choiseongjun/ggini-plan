import assert from 'node:assert/strict';
import {test} from 'node:test';
import {recordDestinationTo} from '../lib/meal-time';
test('record button josa follows the meal label',()=>{
 assert.match(recordDestinationTo('','breakfast'),/아침으로$/);
 assert.match(recordDestinationTo('',null),/식사로$/);
});
