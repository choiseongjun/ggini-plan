import test from 'node:test';
import assert from 'node:assert/strict';
import {isNativeApp} from '../lib/native-environment';
test('native installation prompts are suppressed across old and new iOS/Android builds',()=>{
 assert.equal(isNativeApp({ReactNativeWebView:{postMessage(){}}},'iPhone'),true);
 assert.equal(isNativeApp({__GGINI_NATIVE_PUSH__:'unsupported'}),true);
 assert.equal(isNativeApp({__GGINI_NATIVE_APP__:'ios'}),true);
 assert.equal(isNativeApp({},'Mozilla/5.0 GginiPlanNative/1.0'),true);
 assert.equal(isNativeApp({},'Mozilla/5.0 (iPhone) Safari/604.1'),false);
 assert.equal(isNativeApp({},'Android Chrome/100'),false);
});
