type PhotoWindow=Window&{__GGINI_NATIVE_PHOTO__?:number;ReactNativeWebView?:{postMessage:(value:string)=>void}};
export function hasNativePhotoPicker(){return typeof window!=='undefined'&&(window as PhotoWindow).__GGINI_NATIVE_PHOTO__===1&&Boolean((window as PhotoWindow).ReactNativeWebView);}
export function pickNativePhoto(source:'camera'|'album'):Promise<File|null>{
 return new Promise((resolve,reject)=>{
  const bridge=(window as PhotoWindow).ReactNativeWebView;
  if(!hasNativePhotoPicker()||!bridge){reject(Error('사진 선택을 지원하는 앱으로 업데이트해 주세요.'));return;}
  const requestId=crypto.randomUUID();
  const cleanup=()=>{window.clearTimeout(timer);window.removeEventListener('ggini-native-photo-result',receive);};
  const receive=(event:Event)=>{
   const data=(event as CustomEvent).detail;if(data?.requestId!==requestId)return;
   cleanup();
   if(data.canceled){resolve(null);return;}
   if(data.error){reject(Error(String(data.error)));return;}
   try{
    if(typeof data.base64!=='string'||data.base64.length>Math.ceil(8*1024*1024/3)*4)throw Error();
    const raw=atob(data.base64),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
    resolve(new File([bytes],'meal.jpg',{type:'image/jpeg'}));
   }catch{reject(Error('사진을 읽지 못했어요. 다시 선택해 주세요.'));}
  };
  const timer=window.setTimeout(()=>{cleanup();reject(Error('사진 선택이 오래 걸렸어요. 다시 열어 주세요.'));},300_000);
  window.addEventListener('ggini-native-photo-result',receive);
  try{bridge.postMessage(JSON.stringify({type:'ggini-photo',requestId,source}));}catch{cleanup();reject(Error('사진 선택창을 열지 못했어요.'));}
 });
}
