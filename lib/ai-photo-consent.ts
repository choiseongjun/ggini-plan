'use client';
// AI 사진 분석 동의를 기기·계정별로 기억한다. 체크박스는 계속 보이므로 언제든 해제할 수 있다.
const key=(userId?:string)=>`kkiniplan-ai-photo-consent-v1-${userId??'device'}`;
export function rememberedAiPhotoConsent(userId?:string){
 try{return typeof window!=='undefined'&&localStorage.getItem(key(userId))==='yes';}catch{return false;}
}
export function rememberAiPhotoConsent(userId:string|undefined,value:boolean){
 try{if(value)localStorage.setItem(key(userId),'yes');else localStorage.removeItem(key(userId));}catch{/* Private mode: ask again next time. */}
}
