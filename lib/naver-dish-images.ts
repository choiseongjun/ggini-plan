export type DishImage={thumbnail:string;link:string;sourceHost:string};
export function parseNaverDishImages(data:unknown):DishImage[]{
 if(!data||typeof data!=='object'||!('items' in data)||!Array.isArray(data.items))return [];
 const seen=new Set<string>();
 return data.items.flatMap(item=>{
  try{
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
 const query=`${name.replace(/_/g,' ').replace(/\(.*?\)/g,'').trim()} 레시피`;
 const params=new URLSearchParams({query,display:'15',sort:'sim',format:'json'});
 const response=await fetch(`https://naverapihub.apigw.ntruss.com/search/v1/image?${params}`,{
  headers:{'X-NCP-APIGW-API-KEY-ID':client,'X-NCP-APIGW-API-KEY':secret},
  next:{revalidate:86400},signal:AbortSignal.timeout(8000),
 });
 if(!response.ok)throw Error(`Naver image search HTTP ${response.status}`);
 return parseNaverDishImages(await response.json()).slice(0,count);
}
