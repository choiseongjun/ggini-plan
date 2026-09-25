import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {analyzeMealPhoto,parsePhotoFood} from '../lib/meal-photo-ai';

test('photo estimates reject invalid values and preserve actual food nutrition',()=>{
 const food={name:'김치볶음밥',calories:630,protein:20,carbs:85,fat:23};
 assert.deepEqual(parsePhotoFood(food),food);
 for(const patch of [{calories:-1},{protein:NaN},{fat:Infinity},{carbs:2001},{name:''},{calories:'630'}])assert.equal(parsePhotoFood({...food,...patch}),null);
 assert.equal(parsePhotoFood(null),null);
});

test('a different dish returns its own estimated nutrition; unreadable photos have no estimate',async()=>{
 const previous=process.env.OPENAI_API_KEY;
 process.env.OPENAI_API_KEY='test-key';
 try{
  const image=await sharp({create:{width:16,height:16,channels:3,background:'#fff'}}).jpeg().toBuffer();
  for(const match of ['different','unclear'] as const){
   const food=match==='different'?{name:'김치볶음밥',calories:630,protein:20,carbs:85,fat:23}:null;
   const fetcher:typeof fetch=async(_url,init)=>{
    const request=JSON.parse(String(init?.body));
    assert.equal(request.store,false);
    assert.equal(request.input[0].content.filter((c:{type:string})=>c.type==='input_image').length,1);
    return Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({match,portion:1,extras:[],note:'사진 추정',food})}]}]});
   };
   const result=await analyzeMealPhoto({images:[image],dishName:'조기찜',ingredients:[]},fetcher);
   assert.equal(result.match,match);
   assert.deepEqual(result.food,food);
  }
 }finally{if(previous===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous;}
});
