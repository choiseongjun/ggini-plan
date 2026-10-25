import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clearRetiredFoodModel} from '../lib/retired-model-cleanup';
test('removes only retired model requests, preserving other caches and files',async()=>{
 const urls=['https://huggingface.co/onnx-community/swin-finetuned-food101-ONNX/resolve/e5e50bf/onnx/model_quantized.onnx','https://huggingface.co/other/model/config.json','https://gginiplan.kr/api/photo','https://example.org/onnx-community/swin-finetuned-food101-ONNX/file'];
 const deleted:string[]=[];
 const storage={has:async(name:string)=>{assert.equal(name,'transformers-cache');return true;},open:async(name:string)=>{assert.equal(name,'transformers-cache');return {keys:async()=>urls.map(url=>new Request(url)),delete:async(r:Request)=>{deleted.push(r.url);return true;}};}} as unknown as CacheStorage;
 await clearRetiredFoodModel(storage);assert.deepEqual(deleted,[urls[0]]);
});
test('does not create a cache for users who never downloaded the model',async()=>{
 await clearRetiredFoodModel({has:async()=>false,open:async()=>assert.fail('must not create cache')} as unknown as CacheStorage);
});
