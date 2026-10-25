import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hasNativePhotoPicker,pickNativePhoto} from '../lib/native-photo';
test('native camera/album bridge matches replies, returns photos, and handles cancel/errors',async()=>{
 const old=globalThis.window;
 const target=new EventTarget();let message:{requestId:string;source:string;type:string};
 const fake=Object.assign(target,{setTimeout,clearTimeout,__GGINI_NATIVE_PHOTO__:1,ReactNativeWebView:{postMessage:(text:string)=>{message=JSON.parse(text);}}});
 Object.assign(globalThis,{window:fake});
 const respond=(detail:object)=>target.dispatchEvent(new CustomEvent('ggini-native-photo-result',{detail}));
 try{
  assert.equal(hasNativePhotoPicker(),true);
  const first=pickNativePhoto('camera');assert.equal(message!.source,'camera');assert.equal(message!.type,'ggini-photo');
  respond({requestId:'wrong-request',canceled:true});
  respond({requestId:message!.requestId,base64:btoa('test-photo')});
  const image=await first;assert.equal(image?.type,'image/jpeg');assert.equal(await image?.text(),'test-photo');
  const second=pickNativePhoto('album');assert.equal(message!.source,'album');respond({requestId:message!.requestId,canceled:true});assert.equal(await second,null);
  const third=pickNativePhoto('camera');respond({requestId:message!.requestId,error:'permission denied'});await assert.rejects(third,/permission denied/);
  fake.__GGINI_NATIVE_PHOTO__=0;assert.equal(hasNativePhotoPicker(),false);await assert.rejects(pickNativePhoto('album'));
 }finally{Object.assign(globalThis,{window:old});}
});
