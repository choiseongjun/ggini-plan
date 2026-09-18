export function isKakaoMobileBrowser(userAgent:string){
 return /KAKAOTALK/i.test(userAgent)&&/Android|iPhone|iPad|iPod/i.test(userAgent);
}
export function kakaoExternalUrl(href:string):string|null{
 try{
  const url=new URL(href);
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password)return null;
  // Authentication callbacks must finish in the browser that started them.
  if(/^\/(?:api|auth)(?:\/|$)/.test(url.pathname)||['code','state','access_token','id_token'].some(key=>url.searchParams.has(key))||/access_token=|id_token=/.test(url.hash))return null;
  return `kakaotalk://web/openExternal?url=${encodeURIComponent(url.href)}`;
 }catch{return null;}
}
