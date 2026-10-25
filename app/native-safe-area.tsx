'use client';

import {useEffect} from 'react';
import {isNativeApp} from '../lib/native-environment';

// The native shell wraps the WebView in SafeAreaView. Do not reserve its
// system-bar inset a second time inside the web navigation.
export function NativeSafeArea() {
 useEffect(()=>{
  const sync=()=>{
   if(isNativeApp(window,navigator.userAgent))document.documentElement.dataset.nativeSafeArea='handled';
   else delete document.documentElement.dataset.nativeSafeArea;
  };
  sync();
  window.addEventListener('ggini-native-ready',sync);
  return()=>{window.removeEventListener('ggini-native-ready',sync);delete document.documentElement.dataset.nativeSafeArea;};
 },[]);
 return null;
}
