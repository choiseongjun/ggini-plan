import {test} from 'node:test';
import assert from 'node:assert/strict';
import {appStores,appOpenUrl,claimStoreVisit,mobileAppStore,nativeAppUrl,storeRedirectAllowed} from '../lib/app-store';
test('open links address the installed app before offering the matching store',()=>{
 const android=appOpenUrl(appStores.android);
 assert.ok(android.startsWith('intent:///#Intent;scheme=gginiplan;package=kr.gginiplan.app;'));
 assert.ok(android.includes(`S.browser_fallback_url=${encodeURIComponent(appStores.android.url)};end`));
 assert.equal(appOpenUrl(appStores.ios),nativeAppUrl);
 assert.equal(nativeAppUrl,'gginiplan:///');
});
test('mobile visitors reach the correct published store, including desktop-mode iPads',()=>{
 assert.equal(mobileAppStore('Mozilla/5.0 (Linux; Android 15) Chrome/130'),appStores.android);
 assert.equal(mobileAppStore('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Safari'),appStores.ios);
 assert.equal(mobileAppStore('Mozilla/5.0 (Macintosh) Safari','MacIntel',5),appStores.ios);
 assert.equal(mobileAppStore('Mozilla/5.0 (Macintosh) Safari','MacIntel',0),null);
 assert.equal(mobileAppStore('Mozilla/5.0 (Windows NT 10.0)'),null);
 assert.equal(mobileAppStore('Android Googlebot'),null);
});
test('native apps and installed PWAs cannot be sent back to the store',()=>{
 const url=new URL('https://gginiplan.kr/');
 assert.equal(storeRedirectAllowed(url,{},'Android',false),true);
 assert.equal(storeRedirectAllowed(url,{},'Android GginiPlanNative/1.0',false),false);
 for(const signals of [{ReactNativeWebView:{}},{__GGINI_NATIVE_APP__:'ios'},{__GGINI_NATIVE_PUSH__:'android'}])assert.equal(storeRedirectAllowed(url,signals,'Android',false),false);
 assert.equal(storeRedirectAllowed(url,{},'iPhone',true),false);
});
test('auth, support, search content and web continuations remain accessible',()=>{
 for(const path of ['/app-login','/api/auth/kakao/callback','/privacy','/terms','/delete-account','/admin','/kcal','/kcal/rice','/?auth_error=cancelled','/?code=x','/?state=x','/?from=push','/?web=1'])assert.equal(storeRedirectAllowed(new URL(path,'https://gginiplan.kr'),{},'Android',false),false,path);
 assert.equal(storeRedirectAllowed(new URL('https://gginiplan.kr/?utm_source=threads'),{},'Android',false),true);
});
test('a visit redirects at most once and blocked storage cannot create a loop',()=>{
 const rows=new Map<string,string>();
 const storage={getItem:(k:string)=>rows.get(k)??null,setItem:(k:string,v:string)=>{rows.set(k,v);}};
 assert.equal(claimStoreVisit(storage),true);
 assert.equal(claimStoreVisit(storage),false);
 assert.equal(claimStoreVisit({getItem:()=>{throw new Error('blocked');},setItem:()=>{}}),false);
 assert.equal(claimStoreVisit({getItem:()=>null,setItem:()=>{}}),false);
});
