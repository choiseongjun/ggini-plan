import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {analyzeMealPhoto,parsePhotoFood} from '../lib/meal-photo-ai';

test('photo estimates reject invalid values and preserve actual food nutrition',()=>{
 const food={name:'김치볶음밥',calories:630,protein:20,carbs:85,fat:23,sugar:7.5,sodium:920};
 assert.deepEqual(parsePhotoFood(food),food);
 for(const patch of [{calories:-1},{protein:NaN},{fat:Infinity},{carbs:2001},{name:''},{calories:'630'},{sugar:-1},{sugar:86},{sugar:undefined},{sodium:undefined},{sodium:Infinity},{sodium:50001}])assert.equal(parsePhotoFood({...food,...patch}),null);
 assert.equal(parsePhotoFood(null),null);
});

test('a different dish returns its own estimated nutrition; unreadable photos have no estimate',async()=>{
 const previous=process.env.OPENAI_API_KEY;
 process.env.OPENAI_API_KEY='test-key';
 try{
  const image=await sharp({create:{width:16,height:16,channels:3,background:'#fff'}}).jpeg().toBuffer();
  for(const match of ['different','unclear'] as const){
   const food=match==='different'?{name:'김치볶음밥',calories:630,protein:20,carbs:85,fat:23,sugar:7.5,sodium:920}:null;
   const fetcher:typeof fetch=async(_url,init)=>{
    const request=JSON.parse(String(init?.body));
    assert.equal(request.store,false);
    assert.equal(request.input[0].content.find((c:{type:string})=>c.type==='input_image').detail,'high');
    assert.ok(request.text.format.schema.properties.food.required.includes('sugar'));
    assert.ok(request.text.format.schema.properties.food.required.includes('sodium'));
    assert.equal(request.input[0].content.filter((c:{type:string})=>c.type==='input_image').length,1);
    return Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({match,portion:1,extras:[],note:'사진 추정',food})}]}]});
   };
   const result=await analyzeMealPhoto({images:[image],dishName:'조기찜',ingredients:[]},fetcher);
   assert.equal(result.match,match);
   assert.deepEqual(result.food,food);
  }
 }finally{if(previous===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous;}
});

 test('planning estimates the pictured meal without claiming it was eaten',async()=>{
 const previous=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-key';
 try{const image=await sharp({create:{width:16,height:16,channels:3,background:'#fff'}}).jpeg().toBuffer();
 const result=await analyzeMealPhoto({images:[image],dishName:'지정 메뉴 없음',ingredients:[],purpose:'plan'},async(_url,init)=>{
 const body=JSON.parse(String(init?.body));assert.match(body.instructions,/nobody has eaten this meal yet/);assert.equal(body.store,false);
 return Response.json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({match:'different',portion:1,extras:[],note:'추정',food:{name:'볶음밥',calories:500,protein:15,carbs:70,fat:15,sugar:4,sodium:800}})}]}]});});assert.equal(result.food?.name,'볶음밥');
 }finally{if(previous===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previous;}
 });
