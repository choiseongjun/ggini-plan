import assert from 'node:assert/strict';
import {test} from 'node:test';
import {nextMealHint} from '../lib/next-meal-hint';

const reference={label:'',calories:2000,protein:60,carbs:[250,325] as [number,number],fat:[33,67] as [number,number],sodiumAdequate:1500,sodiumReduction:2300};
test('next meal hint follows what is left today',()=>{
 assert.match(nextMealHint({calories:1900,protein:30},reference).hint,/가벼운 메뉴/);
 assert.match(nextMealHint({calories:700,protein:10},reference).hint,/단백질이 50g/);
 const balanced=nextMealHint({calories:1200,protein:50},reference);
 assert.equal(balanced.kcalLeft,800);
 assert.match(balanced.hint,/남은 800kcal/);
});
