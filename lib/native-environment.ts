type NativeSignals={ReactNativeWebView?:unknown;__GGINI_NATIVE_PUSH__?:unknown;__GGINI_NATIVE_APP__?:unknown};
export function isNativeApp(signals:object,userAgent=''){
 const native=signals as NativeSignals;
 return Boolean(native.ReactNativeWebView||native.__GGINI_NATIVE_APP__||native.__GGINI_NATIVE_PUSH__)||/GginiPlanNative\//i.test(userAgent);
}
