export type DishImage={thumbnail:string;link:string;sourceHost:string};
// Taste/ease descriptions do not identify a different dish in photo search.
// Keep ingredient names and cooking methods (e.g. 해물, 돼지고기, 매운탕).
export function dishImageSearchName(name:string){
 return name.replace(/\(.*?\)/g,'').split('_').map(part=>{
  const original=part.trim();
  return original.replace(/^(?:(?:순한\s*맛|매운\s*맛|순한|얼큰한|담백한|간단한|초간단)\s*)+/,'').trim()||original;
 }).filter(Boolean).join('_');
}
export function parseNaverDishImages(data:unknown,name?:string):DishImage[]{
 if(!data||typeof data!=='object'||!('items' in data)||!Array.isArray(data.items))return [];
 const seen=new Set<string>();
 return data.items.flatMap(item=>{
  try{
   if(name&&!dishImageTitleMatches(item?.title,name))return [];
   if(typeof item.thumbnail!=='string'||typeof item.link!=='string')return [];
   const thumb=new URL(item.thumbnail),original=new URL(item.link);
   if(thumb.protocol!=='https:'||!/(^|\.)pstatic\.net$/.test(thumb.hostname)||!['https:','http:'].includes(original.protocol)||seen.has(original.href))return [];
   seen.add(original.href);
   return [{thumbnail:thumb.href,link:original.href,sourceHost:original.hostname}];
  }catch{return [];}
 });
}
export async function searchNaverDishImages(name:string,count=6):Promise<DishImage[]>{
 const client=process.env.NAVER_SEARCH_CLIENT_ID,secret=process.env.NAVER_SEARCH_CLIENT_SECRET;
 if(!client||!secret)return [];
 const query=`${dishImageSearchName(name).replace(/_/g,' ')} 레시피`;
 const params=new URLSearchParams({query,display:'30',sort:'sim',format:'json'});
 const response=await fetch(`https://naverapihub.apigw.ntruss.com/search/v1/image?${params}`,{
  headers:{'X-NCP-APIGW-API-KEY-ID':client,'X-NCP-APIGW-API-KEY':secret},
  next:{revalidate:86400},signal:AbortSignal.timeout(8000),
 });
 if(!response.ok)throw Error(`Naver image search HTTP ${response.status}`);
 return parseNaverDishImages(await response.json(),name).slice(0,count);
}

// Text relevance only: do not claim that image contents have been visually verified.
export function dishImageTitleMatches(title:unknown,name:string){
 if(typeof title!=='string')return false;
 const normalize=(s:string)=>s.replace(/<[^>]*>/g,'').replace(/&[a-z#0-9]+;/gi,' ').replace(/달걀/g,'계란').replace(/쇠고기/g,'소고기').replace(/[^가-힣a-z0-9]/gi,'').toLowerCase();
 const text=normalize(title);
 const parts=dishImageSearchName(name).split('_').map(normalize).filter(Boolean);
 return parts.length>0&&parts.every(part=>text.includes(part));
}
