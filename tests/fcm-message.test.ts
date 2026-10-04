import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fcmMessage} from '../lib/fcm-message';
import {nativeInput} from '../lib/native-push-input';

test('FCM sends visible iOS alerts with sound and retains Android click data',()=>{
 const message=fcmMessage('token','끼니플랜','점심 시간이에요','/record?from=push','meal-lunch');
 assert.equal(message.apns?.headers?.['apns-push-type'],'alert');
 assert.equal(message.apns?.headers?.['apns-priority'],'10');
 assert.equal(message.apns?.payload?.aps.sound,'default');
 assert.deepEqual(message.notification,{title:'끼니플랜',body:'점심 시간이에요'});
 assert.equal(message.data?.url,'/record?from=push');
 assert.deepEqual(JSON.parse(message.data!.body),{url:message.data!.url});
 assert.equal(message.android?.notification?.channelId,'meal-reminders');
});

test('iOS reminders expire after an hour like Android',()=>{
 const now=Date.UTC(2026,9,4,3,0,0);
 const message=fcmMessage('token','끼니플랜','점심 시간이에요','/','meal-lunch',now);
 assert.equal(message.apns?.headers?.['apns-expiration'],String(now/1000+3600));
 assert.equal(message.apns?.payload?.aps.threadId,'meal-reminders');
});

test('registration accepts iOS FCM tokens and rejects raw APNs tokens',()=>{
 const input={deviceId:'a'.repeat(64),expectedUserId:'1',action:'sync',permissionGranted:true};
 assert.ok(nativeInput({...input,token:'ios-installation:'.padEnd(160,'x')}));
 assert.equal(nativeInput({...input,token:'b'.repeat(64)}),null);
});
