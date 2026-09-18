import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {parseNutritionAI, readNutritionWithAI, nutritionAIConfig} from '../lib/nutrition-ai';
const label={status:'single',text:'100g당 열량 100kcal 단백질 10g 지방 0g',note:null,extracted:{nutritionBasis:'100g당',caloriesKcal:100,proteinG:10,carbohydratesG:15,fatG:0,sodiumMg:100}};
const response=(value:unknown)=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]}));

test('preserves actual zero, leaves unreadable values null, rejects invalid numbers',()=>{
  assert.equal(parseNutritionAI(label).extracted.fatG,0);
  const partial=parseNutritionAI({...label,extracted:{...label.extracted,sodiumMg:null}});
  assert.equal(partial.extracted.sodiumMg,null);assert.ok(partial.warning);
  for(const value of [-1,'12',undefined,Infinity])assert.throws(()=>parseNutritionAI({...label,extracted:{...label.extracted,fatG:value}}));
});
test('ambiguous multiple tables and absent serving basis never fill product fields',()=>{
  for(const patch of [{status:'multiple'},{status:'unreadable'},{extracted:{...label.extracted,nutritionBasis:null}}]){
    const result=parseNutritionAI({...label,...patch});
    assert.ok(Object.values(result.extracted).every(v=>v===null));assert.ok(result.warning);
  }
});
test('server uses image bytes and strict schema, does not store response; safe errors and no retries',async()=>{
  const previousKey=process.env.OPENAI_API_KEY,previousModel=process.env.OPENAI_NUTRITION_MODEL;
  process.env.OPENAI_API_KEY='test-key-not-real';delete process.env.OPENAI_NUTRITION_MODEL;
  try {
    assert.equal(nutritionAIConfig().model,'gpt-4.1');
    const image=await sharp({create:{width:2,height:2,channels:3,background:'white'}}).png().toBuffer();
    let calls=0;
    const fake:typeof fetch=async(url,options)=>{
      calls++;assert.equal(url,'https://api.openai.com/v1/responses');
      assert.equal((options!.headers as Record<string,string>).Authorization,'Bearer test-key-not-real');
      const body=JSON.parse(String(options!.body));assert.equal(body.store,false);assert.equal(body.text.format.strict,true);
      assert.ok(body.input[0].content[1].image_url.startsWith('data:image/png;base64,'));
      assert.equal(body.input[0].content[1].detail,'high');return response(label);
    };
    assert.equal((await readNutritionWithAI({image},fake)).extracted.caloriesKcal,100);assert.equal(calls,1);
    for(const status of [401,403,429,500]) {
      await assert.rejects(()=>readNutritionWithAI({text:'영양표'},async()=>new Response('SECRET UPSTREAM TEXT',{status})),e=>e instanceof Error&&!e.message.includes('SECRET'));
    }
    await assert.rejects(()=>readNutritionWithAI({text:'영양표'},async()=>new Response(JSON.stringify({status:'incomplete',output:[]}))),/완료되지/);
    await assert.rejects(()=>readNutritionWithAI({text:'영양표'},async()=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'refusal'}]}]}))),/읽지 못/);
    delete process.env.OPENAI_API_KEY;
    await assert.rejects(()=>readNutritionWithAI({image},fake),/OPENAI_API_KEY/);assert.equal(calls,1);
  }finally{
    if(previousKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previousKey;
    if(previousModel===undefined)delete process.env.OPENAI_NUTRITION_MODEL;else process.env.OPENAI_NUTRITION_MODEL=previousModel;
  }
});
