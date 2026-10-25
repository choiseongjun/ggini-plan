import {test} from 'node:test';
import assert from 'node:assert/strict';
import {photoReviewState} from '../lib/photo-review-state';
import {manualFoodReference} from '../lib/basic-food-reference';
import type {PhotoMealItem} from '../lib/meal-draft';

const time='2026-01-01T03:00:00Z';
const item:PhotoMealItem={id:'one',name:'만두',originalName:'라비올리',food:manualFoodReference('manual:만두'),portions:1};
test('unknown nutrients stay unknown, but explicit manual recording is allowed',()=>{
 const result=photoReviewState([item],time);
 assert.equal(result.ready,true);assert.equal(result.calories,null);assert.equal(result.missing,1);
});
test('each unfinished field explains why a batch cannot be saved',()=>{
 assert.match(photoReviewState([],time).issues[0].message,/추가/);
 assert.match(photoReviewState([{...item,name:''}],time).issues[0].message,/이름/);
 assert.match(photoReviewState([{...item,food:null}],time).issues[0].message,/영양정보/);
 assert.equal(photoReviewState([{...item,portions:0}],time).ready,false);
 assert.equal(photoReviewState([{...item,portions:1.3}],time).ready,false);
 assert.equal(photoReviewState([item],null).ready,false);
 assert.equal(photoReviewState([item],'2099-01-01T03:00:00Z').ready,false);
});
test('partial nutrition totals scale by portions without counting unknown food as zero',()=>{
 const known={...item,id:'two',food:{...item.food!,kcal:200},portions:1.5};
 const result=photoReviewState([item,known],time);
 assert.equal(result.calories,300);assert.equal(result.missing,1);assert.equal(result.ready,true);
});
