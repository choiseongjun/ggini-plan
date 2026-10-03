import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pantrySourceProducts,pantrySourceRecommendations} from '../lib/pantry-source-recommendations';
import {missingPantryIngredients,pantryOptionalIngredients} from '../lib/pantry-recommendation';
import {relevantRecipeVideos} from '../lib/youtube-recipes';

test('shopping, cooking quantities and video share one source without old nutrition',()=>{
 for(const p of pantrySourceProducts()){
  const source=p.sourceRecipe!;
  assert.ok(source.ingredients.length>0&&source.steps.length>0);
  assert.deepEqual(p.recipe!.ingredients.map(i=>i.label),source.ingredients.map(i=>i.label));
  assert.deepEqual(p.recipe!.steps,source.steps);
  assert.equal(p.id,'source-'+source.video.id);
  assert.equal(source.video.url,'https://www.youtube.com/watch?v='+source.video.id);
  assert.deepEqual(p.recipe!.nutrition,{calories:null,protein:null});
  assert.equal(p.recipe!.minutes,null);
 }
 const chicken=pantrySourceProducts().find(p=>p.name==='닭고기덮밥')!;
 const missing=missingPantryIngredients(chicken,['닭가슴살','밥']);
 assert.ok(missing.includes('닭다리살'));
 assert.ok(missing.includes('맛술'));
 assert.ok(missing.includes('양파'));
 assert.deepEqual(pantryOptionalIngredients(chicken,[]),[]);
});
test('source ingredients include oil, salt and optional MSG without dropping English names',()=>{
 const egg=pantrySourceProducts().find(p=>p.name==='달걀볶음밥')!;
 assert.ok(egg.sourceRecipe!.ingredients.some(i=>i.name==='MSG'&&i.optional));
 assert.ok(missingPantryIngredients(egg,['밥','달걀','파']).includes('식용유'));
 assert.ok(missingPantryIngredients(egg,['밥','달걀','파']).includes('소금'));
 assert.deepEqual(missingPantryIngredients(egg,['밥','달걀','파','간장','소금','식용유']),[]);
});
test('no-shopping mode applies exact source requirements and does not fall back',()=>{
 assert.deepEqual(pantrySourceRecommendations(['달걀'],[],[],false,[],true),[]);
 const found=pantrySourceRecommendations(['밥','달걀','파','간장','소금','식용유'],[],[],false,[],true);
 assert.deepEqual(found.map(p=>p.name),['달걀볶음밥']);
});
test('source exclusions apply to actual ingredients including newly introduced shrimp',()=>{
 const tofu=pantrySourceProducts().find(p=>p.name==='두부조림')!;
 const owned=tofu.recipe!.ingredients.map(i=>i.product.name);
 assert.equal(pantrySourceRecommendations(owned,[],[],true,[],true)[0].name,'두부조림');
 assert.ok(pantrySourceRecommendations(owned,[],[],true,['shrimp'],true).every(p=>p.name!=='두부조림'));
});
test('fried rice does not accept mushroom side dish videos',()=>{
 const video={id:'abcdefghijk',title:'',channel:'출처',url:'',thumbnail:''};
 const list=['새송이버섯볶음밥 만들기','새송이버섯볶음 반찬'].map(title=>({...video,title}));
 assert.deepEqual(relevantRecipeVideos(list,'새송이버섯볶음밥').map(v=>v.title),['새송이버섯볶음밥 만들기']);
});
