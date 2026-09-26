import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseRecipeVideos,relevantRecipeVideos,relevantHaruVideos,recipeVideoDishId,mergeRecipeVideos,HARU_CHANNEL_ID} from '../lib/youtube-recipes';
import {cookingVideoMenu} from '../lib/cooking-recipes';
test('only known recipes can generate searches; ingredient variants share the same query',()=>{
 assert.equal(cookingVideoMenu('arbitrary search'),null);
 assert.deepEqual(cookingVideoMenu('cook-beef-bulgogi--auto--abc~def'),cookingVideoMenu('cook-beef-bulgogi'));
 assert.ok(cookingVideoMenu('cook-fish-cabbage')?.query.includes('생선구이'));
});
test('composed dishes resolve their main recipe and preferred results verify channel identity',()=>{
 assert.equal(recipeVideoDishId('recipe-opt-AI-test--sides-2-side1_side2'),'recipe-opt-AI-test');
 const videos=parseRecipeVideos({items:[
  {id:{videoId:'abcdefghij0'},snippet:{title:'두부부침 만들기',channelTitle:'하루한끼',channelId:HARU_CHANNEL_ID}},
  {id:{videoId:'abcdefghij1'},snippet:{title:'두부부침 만들기',channelTitle:'하루한끼',channelId:'other'}},
 ]},12,HARU_CHANNEL_ID);
 assert.equal(videos.length,1);
 assert.equal(relevantHaruVideos(videos,'두부구이').length,1);
 assert.equal(relevantHaruVideos(videos,'된장찌개').length,0);
});
test('video results validate IDs, ignore malformed results and limit external links',()=>{
 assert.deepEqual(parseRecipeVideos(null),[]);
 assert.deepEqual(parseRecipeVideos({items:[{id:{videoId:'javascript:bad'},snippet:{title:'x',channelTitle:'x'}}]}),[]);
 const data={items:Array.from({length:5},(_,i)=>({id:{videoId:`abcdefghij${i}`},snippet:{title:'요리',channelTitle:'채널'}}))};
 const videos=parseRecipeVideos(data);assert.equal(videos.length,3);
 assert.equal(videos[0].url,'https://www.youtube.com/watch?v=abcdefghij0');
});
test('chicken porridge does not show pork or chicken soup results',()=>{
 const videos=['닭죽 만들기','우삼겹 야채찜','닭백숙 만들기'].map((title,i)=>({id:String(i),title,channel:'요리',url:'',thumbnail:''}));
 assert.deepEqual(relevantRecipeVideos(videos,'닭고기 채소죽').map(v=>v.title),['닭죽 만들기']);
});

test('tofu mushroom steam requires both mushrooms and steaming, not just tofu',()=>{
 const titles=['두부조림 만들기','두부 버섯조림','두부 계란찜','두부 버섯찜 만들기','버섯 두부를 쪄서 먹어요'];
 const videos=titles.map((title,i)=>({id:String(i),title,channel:'요리',url:'',thumbnail:''}));
 assert.deepEqual(relevantRecipeVideos(videos,'두부 버섯찜과 현미밥').map(v=>v.title),titles.slice(3));
 assert.deepEqual(relevantRecipeVideos(videos.slice(0,3),'두부 버섯찜과 현미밥'),[]);
});

test('other cooking methods and named ingredients must also match',()=>{
 const videos=['돼지고기 양배추찜','돼지고기 양배추볶음','돼지고기 볶음','두부 달걀찜','두부 달걀부침'].map((title,i)=>({id:String(i),title,channel:'요리',url:'',thumbnail:''}));
 assert.deepEqual(relevantRecipeVideos(videos,'돼지고기 양배추볶음과 밥').map(v=>v.title),['돼지고기 양배추볶음']);
 assert.deepEqual(relevantRecipeVideos(videos,'두부 달걀부침과 현미밥').map(v=>v.title),['두부 달걀부침']);
});

test('preferred videos come first without hiding other channels or repeating videos',()=>{
 const v=(id:string,channel:string)=>({id,channel,title:'두부구이',url:'',thumbnail:''});
 const preferred=v('preferred','하루한끼'),other=v('other','다른 채널');
 assert.deepEqual(mergeRecipeVideos([preferred],[other,preferred]).map(v=>v.id),['preferred','other']);
 assert.deepEqual(mergeRecipeVideos([],[other]),[other]);
 assert.deepEqual(mergeRecipeVideos([preferred],[]),[preferred]);
});
