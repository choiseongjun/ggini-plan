import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchFoodPages,popularFoods} from '../lib/food-pages';
import {getPool} from '../lib/db';
test('brand plus menu searches match all words and expose comparable serving context',async()=>{
 try{const results=await searchFoodPages('스타벅스 라떼');assert.ok(results.length>0);assert.ok(results.every(r=>r.brand?.includes('스타벅스')&&r.name.includes('라떼')));assert.ok(results.every(r=>Number(r.amount)>0&&r.unit));assert.deepEqual((await searchFoodPages('라떼 스타벅스')).map(r=>r.slug),results.map(r=>r.slug));assert.equal((await searchFoodPages('%_unlikely_search')).length,0);assert.ok((await popularFoods()).every(r=>Number(r.amount)>0&&r.unit));}finally{await getPool().end();}
});
